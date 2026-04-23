import {
  collection, doc, setDoc, updateDoc, deleteDoc, getDoc,
  serverTimestamp, writeBatch, deleteField, getDocs, query, where,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { ok, fail, handleActionError } from '@/lib/errors'
import type { ActionResult } from '@/lib/errors'

// Busca el doc en 'tasks' primero, luego en 'tareas' (legacy)
async function findTaskDoc(workspaceId: string, taskId: string) {
  const newRef = doc(db, `workspaces/${workspaceId}/tasks/${taskId}`)
  const newDoc = await getDoc(newRef)
  if (newDoc.exists()) return newDoc

  const legacyRef = doc(db, `workspaces/${workspaceId}/tareas/${taskId}`)
  const legacyDoc = await getDoc(legacyRef)
  return legacyDoc.exists() ? legacyDoc : null
}

export async function createTask(
  workspaceId: string,
  input: { tipo: 'rutina' | 'puntual'; titulo: string; frecuencia?: 'daily' | 'weekly'; userId?: string },
): Promise<ActionResult<{ id: string }>> {
  try {
    const ref = doc(collection(db, `workspaces/${workspaceId}/tasks`))
    await setDoc(ref, {
      workspaceId,
      tipo:       input.tipo,
      frecuencia: input.frecuencia ?? null,
      titulo:     input.titulo,
      completada: false,
      completadaAt:  null,
      completadaPor: null,
      dueAt:      null,
      asignadoA:  null,
      creadoPor:  input.userId ?? '',
      createdAt:  serverTimestamp(),
    })
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
    const taskDoc = await findTaskDoc(workspaceId, taskId)
    if (!taskDoc) return fail('Tarea no encontrada', 'NOT_FOUND')

    const data = taskDoc.data()
    const completada = !data?.completada

    await updateDoc(taskDoc.ref, {
      completada,
      completadaAt:  completada ? serverTimestamp() : null,
      completadaPor: completada ? '' : null,
    })
    return ok(undefined)
  } catch (err) {
    return handleActionError(err, 'completeTask')
  }
}

export async function deleteTask(
  workspaceId: string,
  taskId: string,
): Promise<ActionResult> {
  try {
    const taskDoc = await findTaskDoc(workspaceId, taskId)
    if (taskDoc) await deleteDoc(taskDoc.ref)
    return ok(undefined)
  } catch (err) {
    return handleActionError(err, 'deleteTask')
  }
}

export async function resetRoutineTasks(
  workspaceId: string,
): Promise<ActionResult> {
  try {
    const batch = writeBatch(db)
    const q = query(
      collection(db, `workspaces/${workspaceId}/tasks`),
      where('tipo', '==', 'rutina'),
      where('completada', '==', true),
    )
    const snap = await getDocs(q)
    snap.docs.forEach(d => {
      batch.update(d.ref, {
        completada:    false,
        completadaAt:  deleteField(),
        completadaPor: deleteField(),
      })
    })
    await batch.commit()
    return ok(undefined)
  } catch (err) {
    return handleActionError(err, 'resetRoutineTasks')
  }
}
