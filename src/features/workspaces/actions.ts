'use server'

import { FieldValue } from 'firebase-admin/firestore'
import { revalidatePath } from 'next/cache'
import { adminDb } from '@/server/firebase-admin'
import { requireAuth, requireMembership } from '@/server/auth'
import { assertCanCreate } from '@/server/services/plan-limits.service'
import { writeAuditLog } from '@/server/audit'
import { CreateWorkspaceSchema, UpdateWorkspaceSchema } from './schemas'
import { ok, fail, handleActionError, parseZodError } from '@/lib/errors'
import type { ActionResult } from '@/lib/errors'
import type { Workspace } from './types'

// ── createWorkspace ───────────────────────────────────────────────────────────

export async function createWorkspace(
  rawInput: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const result = CreateWorkspaceSchema.safeParse(rawInput)
    if (!result.success) {
      return fail('Datos inválidos', 'VALIDATION_ERROR', parseZodError(result.error))
    }
    const input = result.data

    const user = await requireAuth()

    // Check de límite: ¿puede crear otro workspace?
    await assertCanCreate(user, 'workspace')

    const batch = adminDb.batch()

    // Crear el workspace
    const wsRef = adminDb.collection('workspaces').doc()
    const workspace: Omit<Workspace, 'id'> = {
      ownerId:       user.uid,
      nombre:        input.nombre,
      emoji:         input.emoji,
      color:         input.color,
      config:        input.config,
      systemFlags:   undefined,
      activeSystemSlug:             undefined,
      activeSystemActivatedAt:      undefined,
      activeSystemActivationCodeId: undefined,
      isActive:      true,
      customerCount: 0,
      memberCount:   1,  // el owner se cuenta como miembro
      createdAt:     new Date(),
      updatedAt:     new Date(),
    }
    batch.set(wsRef, {
      ...workspace,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    // Registrar al owner como miembro
    const memberRef = adminDb.doc(`workspaces/${wsRef.id}/members/${user.uid}`)
    batch.set(memberRef, {
      id:          user.uid,
      workspaceId: wsRef.id,
      userId:      user.uid,
      email:       user.email,
      displayName: user.displayName,
      photoURL:    user.photoURL ?? null,
      role:        'owner',
      joinedAt:    FieldValue.serverTimestamp(),
    })

    // Incrementar workspaceCount en el usuario
    batch.update(adminDb.doc(`users/${user.uid}`), {
      workspaceCount: FieldValue.increment(1),
    })

    await batch.commit()

    revalidatePath('/dashboard')
    return ok({ id: wsRef.id })

  } catch (err) {
    return handleActionError(err, 'createWorkspace')
  }
}

// ── updateWorkspace ───────────────────────────────────────────────────────────

export async function updateWorkspace(
  workspaceId: string,
  rawInput: unknown,
): Promise<ActionResult> {
  try {
    const result = UpdateWorkspaceSchema.safeParse(rawInput)
    if (!result.success) {
      return fail('Datos inválidos', 'VALIDATION_ERROR', parseZodError(result.error))
    }

    const { user, membership } = await requireMembership(workspaceId, 'admin')

    await adminDb.doc(`workspaces/${workspaceId}`).update({
      ...result.data,
      updatedAt: FieldValue.serverTimestamp(),
    })

    writeAuditLog(workspaceId, user.uid, user.displayName, 'system.activated', {
      entityType: 'workspace',
      entityId:   workspaceId,
      after:      result.data,
    })

    revalidatePath(`/workspace/${workspaceId}`)
    return ok(undefined)

  } catch (err) {
    return handleActionError(err, 'updateWorkspace')
  }
}
