'use server'

import { FieldValue } from 'firebase-admin/firestore'
import { revalidatePath } from 'next/cache'
import { adminDb } from '@/server/firebase-admin'
import { CreateTaskSchema } from './schemas'
import { ok, fail, handleActionError, parseZodError } from '@/lib/errors'
import type { ActionResult } from '@/lib/errors'

const revalidate = (wid: string) => { revalidatePath(`/workspace/${wid}/tareas`); revalidatePath(`/workspace/${wid}/hoy`) }

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
      creadoPor:  '',
      createdAt:  FieldValue.serverTimestamp(),
    })

    revalidate(workspaceId)
    return ok({ id: ref.id })

  } catch (err) {
    return handleActionError(err, 'createTask')
  }
}

// ── Helper: busca el doc en 'tasks' primero, luego en 'tareas' (legacy)
// Garantiza compat con workspaces que tienen datos en la colección vieja.
async function findTaskDoc(workspaceId: string, taskId: string) {
  const newRef = adminDb.doc(`workspaces/${workspaceId}/tasks/${taskId}`)
  const newDoc = await newRef.get()
  if (newDoc.exists) return newDoc

  const legacyRef = adminDb.doc(`workspaces/${workspaceId}/tareas/${taskId}`)
  const legacyDoc = await legacyRef.get()
  return legacyDoc.exists ? legacyDoc : null
}


export async function completeTask(
  workspaceId: string,
  taskId: string,
): Promise<ActionResult> {
  try {

    const taskDoc = await findTaskDoc(workspaceId, taskId)
    if (!taskDoc) return fail('Tarea no encontrada', 'NOT_FOUND')

    const task = taskDoc.data()!

    // Rutinas: se resetean, no se borran
    if (task.tipo === 'rutina') {
      await taskDoc.ref.update({
        completada:    true,
        completadaAt:  FieldValue.serverTimestamp(),
        completadaPor: '',
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

    const taskDocToDel = await findTaskDoc(workspaceId, taskId)
    if (taskDocToDel) await taskDocToDel.ref.delete()

    revalidate(workspaceId)
    return ok(undefined)

  } catch (err) {
    return handleActionError(err, 'deleteTask')
  }
}
