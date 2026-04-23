import {
  collection, doc, setDoc, updateDoc, arrayUnion, arrayRemove, increment, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { ok, fail, handleActionError } from '@/lib/errors'
import type { ActionResult } from '@/lib/errors'

export async function createCatalogItem(
  workspaceId: string,
  input: {
    categoria:    string
    subcategoria: string
    nombre:       string
    precio?:      number
    currency?:    'ARS' | 'USD'
    orden:        number
    trackStock?:  boolean
    stock?:       number
    imei?:        string[]
  },
): Promise<ActionResult<{ id: string }>> {
  try {
    const ref = doc(collection(db, `workspaces/${workspaceId}/catalog`))
    await setDoc(ref, {
      workspaceId,
      categoria:    input.categoria,
      subcategoria: input.subcategoria,
      nombre:       input.nombre,
      precio:       input.precio      ?? null,
      currency:     input.currency    ?? 'ARS',
      activo:       true,
      orden:        input.orden,
      trackStock:   input.trackStock  ?? false,
      stock:        input.stock       ?? 0,
      imei:         input.imei        ?? [],
      createdAt:    serverTimestamp(),
    })
    return ok({ id: ref.id })
  } catch (err) {
    return handleActionError(err, 'createCatalogItem')
  }
}

export async function updateCatalogItem(
  workspaceId: string,
  itemId:      string,
  input: {
    nombre?:      string
    precio?:      number
    currency?:    'ARS' | 'USD'
    trackStock?:  boolean
    stock?:       number
  },
): Promise<ActionResult> {
  try {
    await updateDoc(doc(db, `workspaces/${workspaceId}/catalog/${itemId}`), {
      ...input,
      updatedAt: serverTimestamp(),
    })
    return ok(undefined)
  } catch (err) {
    return handleActionError(err, 'updateCatalogItem')
  }
}

export async function addImeiToCatalogItem(
  workspaceId: string,
  itemId:      string,
  imeis:       string[],
): Promise<ActionResult> {
  try {
    await updateDoc(doc(db, `workspaces/${workspaceId}/catalog/${itemId}`), {
      imei:  arrayUnion(...imeis),
      stock: increment(imeis.length),
    })
    return ok(undefined)
  } catch (err) {
    return handleActionError(err, 'addImeiToCatalogItem')
  }
}

// Llamado al confirmar una venta desde stock
export async function decrementStock(
  workspaceId:  string,
  itemId:       string,
  quantity:     number,
  imeiVendido?: string,
): Promise<ActionResult> {
  try {
    const updates: Record<string, unknown> = {
      stock: increment(-quantity),
    }
    if (imeiVendido) {
      updates.imei = arrayRemove(imeiVendido)
    }
    await updateDoc(doc(db, `workspaces/${workspaceId}/catalog/${itemId}`), updates)
    return ok(undefined)
  } catch (err) {
    return handleActionError(err, 'decrementStock')
  }
}

export async function deleteCatalogItem(
  workspaceId: string,
  itemId:      string,
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
