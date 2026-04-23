'use server'

import { FieldValue } from 'firebase-admin/firestore'
import { revalidatePath } from 'next/cache'
import { adminDb } from '@/server/firebase-admin'
import { CreateCatalogItemSchema } from './schemas'
import { ok, fail, handleActionError, parseZodError } from '@/lib/errors'
import type { ActionResult } from '@/lib/errors'

export async function createCatalogItem(
  workspaceId: string,
  rawInput: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const result = CreateCatalogItemSchema.safeParse(rawInput)
    if (!result.success) {
      return fail('Datos inválidos', 'VALIDATION_ERROR', parseZodError(result.error))
    }
    const input = result.data


    const ref = adminDb.collection(`workspaces/${workspaceId}/catalog`).doc()
    await ref.set({
      workspaceId,
      ...input,
      activo:    true,
      createdAt: FieldValue.serverTimestamp(),
    })

    revalidatePath(`/workspace/${workspaceId}/catalogo`)
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

    await adminDb
      .doc(`workspaces/${workspaceId}/catalog/${itemId}`)
      .update({ activo: false })

    revalidatePath(`/workspace/${workspaceId}/catalogo`)
    return ok(undefined)

  } catch (err) {
    return handleActionError(err, 'deleteCatalogItem')
  }
}
