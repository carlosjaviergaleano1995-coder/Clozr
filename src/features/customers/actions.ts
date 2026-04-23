'use server'

import { FieldValue } from 'firebase-admin/firestore'
import { revalidatePath } from 'next/cache'
import { adminDb } from '@/server/firebase-admin'
import { CreateCustomerSchema, UpdateCustomerSchema } from './schemas'
import { generateSearchTokens } from './utils'
import { ok, fail, handleActionError, parseZodError } from '@/lib/errors'
import type { ActionResult } from '@/lib/errors'
import { getCustomerById } from './queries'

// ── createCustomer ────────────────────────────────────────────────────────────
// userId se pasa desde el cliente (ya autenticado via Firebase Auth).
// Las Firestore Security Rules validan que el usuario sea miembro del workspace.

export async function createCustomer(
  workspaceId: string,
  rawInput: unknown,
  userId?: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const result = CreateCustomerSchema.safeParse(rawInput)
    if (!result.success) {
      return fail('Datos inválidos', 'VALIDATION_ERROR', parseZodError(result.error))
    }
    const input = result.data

    if (!workspaceId) return fail('Workspace requerido', 'VALIDATION_ERROR')

    const searchTokens = generateSearchTokens(input)
    const ref = adminDb.collection(`workspaces/${workspaceId}/clientes`).doc()

    await ref.set({
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
      createdAt:    FieldValue.serverTimestamp(),
      updatedAt:    FieldValue.serverTimestamp(),
    })

    revalidatePath(`/workspace/${workspaceId}/clientes`)
    revalidatePath(`/workspace/${workspaceId}/hoy`)
    return ok({ id: ref.id })

  } catch (err) {
    return handleActionError(err, 'createCustomer')
  }
}

// ── updateCustomer ────────────────────────────────────────────────────────────

export async function updateCustomer(
  workspaceId: string,
  customerId: string,
  rawInput: unknown,
): Promise<ActionResult> {
  try {
    const result = UpdateCustomerSchema.safeParse(rawInput)
    if (!result.success) {
      return fail('Datos inválidos', 'VALIDATION_ERROR', parseZodError(result.error))
    }
    const input = result.data

    const current = await getCustomerById(workspaceId, customerId)
    if (!current) return fail('Cliente no encontrado', 'NOT_FOUND')

    const needsTokenRegen = input.nombre || input.telefono !== undefined || input.barrio !== undefined
    const searchTokens = needsTokenRegen
      ? generateSearchTokens({
          nombre:   input.nombre   ?? current.nombre,
          telefono: input.telefono ?? current.telefono,
          barrio:   input.barrio   ?? current.barrio,
          email:    input.email    ?? current.email,
        })
      : undefined

    const updates: Record<string, unknown> = {
      ...input,
      ...(searchTokens ? { searchTokens } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    }

    // Limpiar strings vacíos → null
    if (input.email === '')    updates.email    = null
    if (input.telefono === '') updates.telefono = null

    await adminDb
      .doc(`workspaces/${workspaceId}/clientes/${customerId}`)
      .update(updates)

    revalidatePath(`/workspace/${workspaceId}/clientes`)
    return ok(undefined)

  } catch (err) {
    return handleActionError(err, 'updateCustomer')
  }
}

// ── deleteCustomer ────────────────────────────────────────────────────────────

export async function deleteCustomer(
  workspaceId: string,
  customerId: string,
): Promise<ActionResult> {
  try {
    await adminDb
      .doc(`workspaces/${workspaceId}/clientes/${customerId}`)
      .delete()

    revalidatePath(`/workspace/${workspaceId}/clientes`)
    return ok(undefined)

  } catch (err) {
    return handleActionError(err, 'deleteCustomer')
  }
}
