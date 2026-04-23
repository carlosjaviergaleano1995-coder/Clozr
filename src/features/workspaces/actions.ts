'use server'

import { FieldValue } from 'firebase-admin/firestore'
import { revalidatePath } from 'next/cache'
import { adminDb } from '@/server/firebase-admin'
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


    // Check de límite: ¿puede crear otro workspace?

    const batch = adminDb.batch()

    // Crear el workspace
    const wsRef = adminDb.collection('workspaces').doc()
    const workspace: Omit<Workspace, 'id'> = {
      ownerId:       '',
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
    const memberRef = adminDb.doc(`workspaces/${wsRef.id}/members/${''}`)
    batch.set(memberRef, {
      id:          '',
      workspaceId: wsRef.id,
      userId:      '',
      email:       '',
      displayName: '',
      photoURL:    null,
      role:        'owner',
      joinedAt:    FieldValue.serverTimestamp(),
    })

    // Incrementar workspaceCount en el usuario
    batch.update(adminDb.doc(`users/${''}`), {
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


    await adminDb.doc(`workspaces/${workspaceId}`).update({
      ...result.data,
      updatedAt: FieldValue.serverTimestamp(),
    })


    revalidatePath(`/workspace/${workspaceId}`)
    return ok(undefined)

  } catch (err) {
    return handleActionError(err, 'updateWorkspace')
  }
}
