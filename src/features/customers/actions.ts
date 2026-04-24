// Operaciones CRUD de clientes — usa Client SDK directamente
// (el Admin SDK no está disponible en este proyecto — ver docs/AUTH_SERVER_SIDE.md)

import {
  collection, doc, setDoc, updateDoc, deleteDoc,
  serverTimestamp, getDoc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { CreateCustomerSchema, UpdateCustomerSchema } from './schemas'
import { generateSearchTokens } from './utils'
import { ok, fail, handleActionError, parseZodError } from '@/lib/errors'
import type { ActionResult } from '@/lib/errors'

export async function createCustomer(
  workspaceId: string,
  rawInput: unknown,
  userId?: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const result = CreateCustomerSchema.safeParse(rawInput)
    if (!result.success) return fail('Datos inválidos', 'VALIDATION_ERROR', parseZodError(result.error))
    const input = result.data

    const searchTokens = generateSearchTokens(input)
    const ref = doc(collection(db, `workspaces/${workspaceId}/clientes`))

    await setDoc(ref, {
      workspaceId,
      nombre:       input.nombre,
      telefono:     input.telefono  ?? null,
      email:        input.email     ?? null,
      tipo:         input.tipo,
      estado:       input.estado,
      barrio:       input.barrio    ?? null,
      direccion:    input.direccion ?? null,
      dni:          input.dni       ?? null,
      referidoPor:  input.referidoPor ?? null,
      referido:     input.referido  ?? null,
      notas:        input.notas     ?? null,
      customFields: input.customFields ?? null,
      tags:         input.tags      ?? [],
      searchTokens,
      totalSales:   0,
      lastInteractionAt: null,
      creadoPor:    userId ?? '',
      createdAt:    serverTimestamp(),
      updatedAt:    serverTimestamp(),
    })

    return ok({ id: ref.id })
  } catch (err: any) {
    console.error('[createCustomer] Firestore error:', err?.code, err?.message)
    return handleActionError(err, 'createCustomer')
  }
}

export async function updateCustomer(
  workspaceId: string,
  customerId: string,
  rawInput: unknown,
): Promise<ActionResult> {
  try {
    const result = UpdateCustomerSchema.safeParse(rawInput)
    if (!result.success) return fail('Datos inválidos', 'VALIDATION_ERROR', parseZodError(result.error))
    const input = result.data

    const updates: Record<string, unknown> = {
      ...input,
      updatedAt: serverTimestamp(),
    }
    if (input.email === '')    updates.email    = null
    if (input.telefono === '') updates.telefono = null

    await updateDoc(doc(db, `workspaces/${workspaceId}/clientes/${customerId}`), updates)
    return ok(undefined)
  } catch (err: any) {
    console.error('[updateCustomer] Firestore error:', err?.code, err?.message)
    return handleActionError(err, 'updateCustomer')
  }
}

export async function deleteCustomer(
  workspaceId: string,
  customerId: string,
): Promise<ActionResult> {
  try {
    await deleteDoc(doc(db, `workspaces/${workspaceId}/clientes/${customerId}`))
    return ok(undefined)
  } catch (err) {
    return handleActionError(err, 'deleteCustomer')
  }
}
