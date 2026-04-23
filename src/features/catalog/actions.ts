import {
  collection, doc, setDoc, updateDoc, deleteDoc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { ok, fail, handleActionError } from '@/lib/errors'
import type { ActionResult } from '@/lib/errors'

export async function createCatalogItem(
  workspaceId: string,
  input: {
    categoria: string; subcategoria: string; nombre: string
    precio?: number; currency?: 'ARS' | 'USD'; orden: number
  },
): Promise<ActionResult<{ id: string }>> {
  try {
    const ref = doc(collection(db, `workspaces/${workspaceId}/catalog`))
    await setDoc(ref, {
      workspaceId,
      categoria:    input.categoria,
      subcategoria: input.subcategoria,
      nombre:       input.nombre,
      precio:       input.precio   ?? null,
      currency:     input.currency ?? 'ARS',
      activo:       true,
      orden:        input.orden,
      createdAt:    serverTimestamp(),
    })
    return ok({ id: ref.id })
  } catch (err) {
    return handleActionError(err, 'createCatalogItem')
  }
}

export async function deleteCatalogItem(
  workspaceId: string,
  itemId: string,
): Promise<ActionResult> {
  try {
    await updateDoc(doc(db, `workspaces/${workspaceId}/catalog/${itemId}`), {
      activo: false,
    })
    return ok(undefined)
  } catch (err) {
    return handleActionError(err, 'deleteCatalogItem')
  }
}
