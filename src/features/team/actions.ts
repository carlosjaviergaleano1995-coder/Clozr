'use server'

import { FieldValue } from 'firebase-admin/firestore'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { adminDb } from '@/server/firebase-admin'
import { requireMembership } from '@/server/auth'
import { requirePermission } from '@/server/permissions'
import { writeAuditLog } from '@/server/audit'
import { ok, fail, handleActionError, parseZodError } from '@/lib/errors'
import type { ActionResult } from '@/lib/errors'
import type { MemberRole } from './types'

const ChangeMemberRoleSchema = z.object({
  targetUid: z.string().min(1),
  newRole:   z.enum(['admin', 'vendedor', 'viewer']),
  // 'owner' no se puede asignar — el owner es único e intransferible
})

export async function changeMemberRole(
  workspaceId: string,
  rawInput: unknown,
): Promise<ActionResult> {
  try {
    const result = ChangeMemberRoleSchema.safeParse(rawInput)
    if (!result.success) {
      return fail('Datos inválidos', 'VALIDATION_ERROR', parseZodError(result.error))
    }
    const { targetUid, newRole } = result.data

    const { user, membership } = await requireMembership(workspaceId)
    requirePermission(membership.role, 'member:role_change')

    if (targetUid === user.uid) {
      return fail('No podés cambiar tu propio rol', 'FORBIDDEN')
    }

    const targetDoc = await adminDb
      .doc(`workspaces/${workspaceId}/members/${targetUid}`)
      .get()
    if (!targetDoc.exists) return fail('Miembro no encontrado', 'NOT_FOUND')

    const targetMembership = targetDoc.data()!
    if (targetMembership.role === 'owner') {
      return fail('No se puede cambiar el rol del owner', 'FORBIDDEN')
    }

    const prevRole = targetMembership.role as MemberRole

    await targetDoc.ref.update({ role: newRole })

    writeAuditLog(workspaceId, user.uid, user.displayName, 'member.role_changed', {
      entityType: 'member',
      entityId:   targetUid,
      before:     { role: prevRole },
      after:      { role: newRole },
    })

    revalidatePath(`/workspace/${workspaceId}/equipo`)
    return ok(undefined)

  } catch (err) {
    return handleActionError(err, 'changeMemberRole')
  }
}

export async function removeMember(
  workspaceId: string,
  targetUid: string,
): Promise<ActionResult> {
  try {
    const { user, membership } = await requireMembership(workspaceId)
    requirePermission(membership.role, 'member:remove')

    if (targetUid === user.uid) {
      return fail('No podés removerte a vos mismo — transferí la propiedad primero', 'FORBIDDEN')
    }

    const targetDoc = await adminDb
      .doc(`workspaces/${workspaceId}/members/${targetUid}`)
      .get()
    if (!targetDoc.exists) return fail('Miembro no encontrado', 'NOT_FOUND')

    if (targetDoc.data()!.role === 'owner') {
      return fail('No se puede remover al owner', 'FORBIDDEN')
    }

    const batch = adminDb.batch()
    batch.delete(targetDoc.ref)
    batch.update(adminDb.doc(`workspaces/${workspaceId}`), {
      memberCount: FieldValue.increment(-1),
      updatedAt:   FieldValue.serverTimestamp(),
    })
    await batch.commit()

    writeAuditLog(workspaceId, user.uid, user.displayName, 'member.removed', {
      entityType: 'member',
      entityId:   targetUid,
      before:     { email: targetDoc.data()!.email, role: targetDoc.data()!.role },
    })

    revalidatePath(`/workspace/${workspaceId}/equipo`)
    return ok(undefined)

  } catch (err) {
    return handleActionError(err, 'removeMember')
  }
}

export async function listMembers(workspaceId: string) {
  const snap = await adminDb
    .collection(`workspaces/${workspaceId}/members`)
    .get()
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}
