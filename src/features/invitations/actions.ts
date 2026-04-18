'use server'

import { FieldValue } from 'firebase-admin/firestore'
import { randomUUID } from 'crypto'
import { adminDb } from '@/server/firebase-admin'
import { requireMembership } from '@/server/auth'
import { requirePermission } from '@/server/permissions'
import { assertCanCreate } from '@/server/services/plan-limits.service'
import { writeAuditLog } from '@/server/audit'
import { InviteMemberSchema, AcceptInvitationSchema } from './schemas'
import { ok, fail, handleActionError, parseZodError } from '@/lib/errors'
import type { ActionResult } from '@/lib/errors'
import type { WorkspaceInvitation } from './types'
import type { Membership } from '@/features/team/types'
import { getWorkspaceById } from '@/features/workspaces/queries'
import { revalidatePath } from 'next/cache'

// ── inviteMember ──────────────────────────────────────────────────────────────

export async function inviteMember(
  rawInput: unknown,
): Promise<ActionResult<{ token: string; inviteUrl: string }>> {
  try {
    const result = InviteMemberSchema.safeParse(rawInput)
    if (!result.success) {
      return fail('Datos inválidos', 'VALIDATION_ERROR', parseZodError(result.error))
    }
    const { workspaceId, email, role } = result.data

    const { user, membership } = await requireMembership(workspaceId)
    requirePermission(membership.role, 'member:invite')

    // Check límite de miembros
    const workspace = await getWorkspaceById(workspaceId)
    if (!workspace) return fail('Negocio no encontrado', 'NOT_FOUND')
    await assertCanCreate(user, 'member', workspace)

    // ¿Ya existe una invitación pendiente para ese email?
    const existingSnap = await adminDb
      .collection(`workspaces/${workspaceId}/invitations`)
      .where('invitedEmail', '==', email)
      .where('status', '==', 'pending')
      .limit(1)
      .get()

    if (!existingSnap.empty) {
      // Devolver el token existente en lugar de crear uno nuevo
      const existing = existingSnap.docs[0].data() as WorkspaceInvitation
      const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://clozr.vercel.app'}/invite/${existing.token}`
      return ok({ token: existing.token, inviteUrl })
    }

    // ¿Ya es miembro?
    const existingMemberSnap = await adminDb
      .collection(`workspaces/${workspaceId}/members`)
      .where('email', '==', email)
      .limit(1)
      .get()

    if (!existingMemberSnap.empty) {
      return fail('Este usuario ya es miembro del negocio', 'FORBIDDEN')
    }

    const token     = randomUUID()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 días

    const inviteRef = adminDb.collection(`workspaces/${workspaceId}/invitations`).doc()
    await inviteRef.set({
      id:            inviteRef.id,
      workspaceId,
      invitedEmail:  email,
      role,
      token,
      invitedBy:     user.uid,
      invitedByName: user.displayName,
      status:        'pending',
      expiresAt,
      createdAt:     FieldValue.serverTimestamp(),
    })

    writeAuditLog(workspaceId, user.uid, user.displayName, 'member.invited', {
      entityType: 'invitation',
      entityId:   inviteRef.id,
      after:      { email, role },
    })

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://clozr.vercel.app'}/invite/${token}`
    revalidatePath(`/workspace/${workspaceId}/equipo`)
    return ok({ token, inviteUrl })

  } catch (err) {
    return handleActionError(err, 'inviteMember')
  }
}

// ── acceptInvitation ──────────────────────────────────────────────────────────
// El usuario que recibe el link llama a esta acción.
// Crea el Membership y marca la invitación como aceptada.

export async function acceptInvitation(
  rawInput: unknown,
): Promise<ActionResult<{ workspaceId: string }>> {
  try {
    const result = AcceptInvitationSchema.safeParse(rawInput)
    if (!result.success) {
      return fail('Token inválido', 'VALIDATION_ERROR', parseZodError(result.error))
    }
    const { token } = result.data

    // Necesitamos el usuario actual — pero esta acción viene de una página pública
    // Se llama después de que el usuario está autenticado
    const { requireAuth } = await import('@/server/auth')
    const user = await requireAuth()

    // Buscar la invitación por token (colección global no disponible — buscamos diferente)
    // La invitación vive en workspaces/{wid}/invitations — necesitamos collectionGroup
    const { adminDb: db } = await import('@/server/firebase-admin')
    const snap = await db
      .collectionGroup('invitations')
      .where('token', '==', token)
      .limit(1)
      .get()

    if (snap.empty) return fail('Invitación no encontrada o inválida', 'NOT_FOUND')

    const inviteDoc  = snap.docs[0]
    const invitation = { id: inviteDoc.id, ...inviteDoc.data() } as WorkspaceInvitation

    if (invitation.status !== 'pending') {
      if (invitation.status === 'accepted') return fail('Esta invitación ya fue aceptada', 'FORBIDDEN')
      if (invitation.status === 'expired')  return fail('Esta invitación expiró',          'FORBIDDEN')
      return fail('Invitación inválida', 'FORBIDDEN')
    }

    if (new Date(invitation.expiresAt) < new Date()) {
      await inviteDoc.ref.update({ status: 'expired' })
      return fail('Esta invitación expiró', 'FORBIDDEN')
    }

    const { workspaceId } = invitation

    // ¿Ya es miembro?
    const existingMember = await adminDb
      .doc(`workspaces/${workspaceId}/members/${user.uid}`)
      .get()

    if (existingMember.exists) {
      // Ya es miembro — simplemente marcar la invitación como aceptada
      await inviteDoc.ref.update({ status: 'accepted', acceptedByUid: user.uid, acceptedAt: FieldValue.serverTimestamp() })
      return ok({ workspaceId })
    }

    // Transacción: crear Membership + actualizar invitación + incrementar contador
    await adminDb.runTransaction(async tx => {
      const memberRef = adminDb.doc(`workspaces/${workspaceId}/members/${user.uid}`)
      const wsRef     = adminDb.doc(`workspaces/${workspaceId}`)

      const newMembership: Omit<Membership, 'id'> = {
        workspaceId,
        userId:      user.uid,
        email:       user.email,
        displayName: user.displayName,
        photoURL:    user.photoURL,
        role:        invitation.role,
        joinedAt:    new Date(),
        invitedBy:   invitation.invitedBy,
      }

      tx.set(memberRef, {
        ...newMembership,
        id:       user.uid,
        joinedAt: FieldValue.serverTimestamp(),
      })

      tx.update(inviteDoc.ref, {
        status:         'accepted',
        acceptedByUid:  user.uid,
        acceptedAt:     FieldValue.serverTimestamp(),
      })

      tx.update(wsRef, {
        memberCount: FieldValue.increment(1),
        updatedAt:   FieldValue.serverTimestamp(),
      })
    })

    writeAuditLog(
      workspaceId,
      user.uid,
      user.displayName,
      'member.invited',
      { entityType: 'member', entityId: user.uid, after: { role: invitation.role } },
    )

    revalidatePath(`/workspace/${workspaceId}/equipo`)
    return ok({ workspaceId })

  } catch (err) {
    return handleActionError(err, 'acceptInvitation')
  }
}

// ── revokeInvitation ──────────────────────────────────────────────────────────

export async function revokeInvitation(
  workspaceId: string,
  invitationId: string,
): Promise<ActionResult> {
  try {
    const { user, membership } = await requireMembership(workspaceId)
    requirePermission(membership.role, 'member:invite')

    await adminDb
      .doc(`workspaces/${workspaceId}/invitations/${invitationId}`)
      .update({ status: 'expired' })

    revalidatePath(`/workspace/${workspaceId}/equipo`)
    return ok(undefined)

  } catch (err) {
    return handleActionError(err, 'revokeInvitation')
  }
}
