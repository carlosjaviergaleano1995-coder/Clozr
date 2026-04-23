import {
  collection, doc, setDoc, updateDoc, serverTimestamp, getDoc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { ok, fail, handleActionError } from '@/lib/errors'
import type { ActionResult } from '@/lib/errors'

export async function createWorkspace(
  input: {
    nombre: string; emoji?: string; color?: string
    config?: Record<string, unknown>; userId?: string
  },
): Promise<ActionResult<{ id: string }>> {
  try {
    if (!input.nombre?.trim()) return fail('Nombre requerido', 'VALIDATION_ERROR')

    const ref = doc(collection(db, 'workspaces'))
    await setDoc(ref, {
      nombre:      input.nombre.trim(),
      emoji:       input.emoji  ?? '🏪',
      color:       input.color  ?? '#E8001D',
      config:      input.config ?? {},
      ownerId:     input.userId ?? '',
      miembros:    [input.userId ?? ''],
      customerCount: 0,
      plan:        'free',
      createdAt:   serverTimestamp(),
      updatedAt:   serverTimestamp(),
    })

    // Crear membership del owner
    if (input.userId) {
      await setDoc(doc(db, `workspaces/${ref.id}/members/${input.userId}`), {
        workspaceId: ref.id,
        userId:      input.userId,
        role:        'owner',
        joinedAt:    serverTimestamp(),
      })
    }

    return ok({ id: ref.id })
  } catch (err) {
    return handleActionError(err, 'createWorkspace')
  }
}

export async function updateWorkspace(
  workspaceId: string,
  input: { nombre?: string; emoji?: string; color?: string; config?: Record<string, unknown> },
): Promise<ActionResult> {
  try {
    const updates: Record<string, unknown> = { updatedAt: serverTimestamp() }
    if (input.nombre !== undefined) updates.nombre = input.nombre.trim()
    if (input.emoji  !== undefined) updates.emoji  = input.emoji
    if (input.color  !== undefined) updates.color  = input.color
    if (input.config !== undefined) updates.config = input.config

    await updateDoc(doc(db, `workspaces/${workspaceId}`), updates)
    return ok(undefined)
  } catch (err) {
    return handleActionError(err, 'updateWorkspace')
  }
}
