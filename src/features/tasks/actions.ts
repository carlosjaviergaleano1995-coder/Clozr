'use server'

import { FieldValue } from 'firebase-admin/firestore'
import { revalidatePath } from 'next/cache'
import { adminDb } from '@/server/firebase-admin'
import { requireMembership } from '@/server/auth'
import { requirePermission } from '@/server/permissions'
import { CreateTaskSchema } from './schemas'
import { ok, fail, handleActionError, parseZodError } from '@/lib/errors'
import type { ActionResult } from '@/lib/errors'

const revalidate = (wid: string) => revalidatePath(`/workspace/${wid}/tareas`)

export async function createTask(
  workspaceId: string,
  rawInput: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const result = CreateTaskSchema.safeParse(rawInput)
    if (!result.success) {
      return fail('Datos inválidos', 'VALIDATION_ERROR', parseZodError(result.error))
    }
    const input = result.data

    const { user, membership } = await requireMembership(workspaceId)
    requirePermission(membership.role, 'task:create')

    const ref = adminDb.collection(`workspaces/${workspaceId}/tasks`).doc()
    await ref.set({
      workspaceId,
      tipo:       input.tipo,
      frecuencia: input.frecuencia ?? null,
      titulo:     input.titulo,
      completada: false,
      completadaAt:  null,
      completadaPor: null,
      dueAt:      input.dueAt    ?? null,
      asignadoA:  input.asignadoA ?? null,
      creadoPor:  user.uid,
      createdAt:  FieldValue.serverTimestamp(),
    })

    revalidate(workspaceId)
    return ok({ id: ref.id })

  } catch (err) {
    return handleActionError(err, 'createTask')
  }
}

export async function completeTask(
  workspaceId: string,
  taskId: string,
): Promise<ActionResult> {
  try {
    const { user, membership } = await requireMembership(workspaceId)
    requirePermission(membership.role, 'task:complete')

    const taskDoc = await adminDb
      .doc(`workspaces/${workspaceId}/tasks/${taskId}`)
      .get()
    if (!taskDoc.exists) return fail('Tarea no encontrada', 'NOT_FOUND')

    const task = taskDoc.data()!

    // Rutinas: se resetean, no se borran
    if (task.tipo === 'rutina') {
      await taskDoc.ref.update({
        completada:    true,
        completadaAt:  FieldValue.serverTimestamp(),
        completadaPor: user.uid,
      })
    } else {
      // Puntuales: se borran al completarse
      await taskDoc.ref.delete()
    }

    revalidate(workspaceId)
    return ok(undefined)

  } catch (err) {
    return handleActionError(err, 'completeTask')
  }
}

export async function resetRoutineTasks(
  workspaceId: string,
): Promise<ActionResult> {
  try {
    const { membership } = await requireMembership(workspaceId)
    requirePermission(membership.role, 'task:complete')

    const snap = await adminDb
      .collection(`workspaces/${workspaceId}/tasks`)
      .where('tipo', '==', 'rutina')
      .where('completada', '==', true)
      .get()

    if (snap.empty) return ok(undefined)

    const batch = adminDb.batch()
    snap.docs.forEach(d => {
      batch.update(d.ref, {
        completada:    false,
        completadaAt:  FieldValue.delete(),
        completadaPor: FieldValue.delete(),
      })
    })
    await batch.commit()

    revalidate(workspaceId)
    return ok(undefined)

  } catch (err) {
    return handleActionError(err, 'resetRoutineTasks')
  }
}

export async function deleteTask(
  workspaceId: string,
  taskId: string,
): Promise<ActionResult> {
  try {
    const { membership } = await requireMembership(workspaceId)
    requirePermission(membership.role, 'task:create')

    await adminDb.doc(`workspaces/${workspaceId}/tasks/${taskId}`).delete()

    revalidate(workspaceId)
    return ok(undefined)

  } catch (err) {
    return handleActionError(err, 'deleteTask')
  }
}
