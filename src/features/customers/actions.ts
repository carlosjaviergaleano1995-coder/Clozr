'use server'

import { FieldValue } from 'firebase-admin/firestore'
import { revalidatePath } from 'next/cache'
import { adminDb } from '@/server/firebase-admin'
import { requireMembership } from '@/server/auth'
import { requirePermission } from '@/server/permissions'
import { assertCanCreate } from '@/server/services/plan-limits.service'
import { writeAuditLog } from '@/server/audit'
import { CreateCustomerSchema, UpdateCustomerSchema } from './schemas'
import { generateSearchTokens } from './utils'
import { ok, fail, handleActionError, parseZodError } from '@/lib/errors'
import type { ActionResult } from '@/lib/errors'
import type { Customer } from './types'
import { getCustomerById } from './queries'
import { getWorkspaceById } from '@/features/workspaces/queries'

// ── createCustomer ────────────────────────────────────────────────────────────

export async function createCustomer(
  workspaceId: string,
  rawInput: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    // 1. Validar input
    const result = CreateCustomerSchema.safeParse(rawInput)
    if (!result.success) {
      return fail('Datos inválidos', 'VALIDATION_ERROR', parseZodError(result.error))
    }
    const input = result.data

    // 2. Auth + permisos
    const { user, membership } = await requireMembership(workspaceId)
    requirePermission(membership.role, 'customer:create')

    // 3. Check de límite de plan
    const workspace = await getWorkspaceById(workspaceId)
    if (!workspace) return fail('Negocio no encontrado', 'NOT_FOUND')
    await assertCanCreate(user, 'customer', workspace)

    // 4. Preparar datos
    const searchTokens = generateSearchTokens(input)

    const batch = adminDb.batch()
    const ref   = adminDb.collection(`workspaces/${workspaceId}/clientes`).doc()

    batch.set(ref, {
      workspaceId,
      nombre:       input.nombre,
      telefono:     input.telefono     ?? null,
      email:        input.email        ?? null,
      tipo:         input.tipo,
      estado:       input.estado,
      barrio:       input.barrio       ?? null,
      direccion:    input.direccion    ?? null,
      dni:          input.dni          ?? null,
      referidoPor:  input.referidoPor  ?? null,
      notas:        input.notas        ?? null,
      customFields: input.customFields ?? null,
      tags:         input.tags         ?? [],
      searchTokens,
      totalSales:   0,
      lastInteractionAt: null,
      creadoPor:    user.uid,
      createdAt:    FieldValue.serverTimestamp(),
      updatedAt:    FieldValue.serverTimestamp(),
    })

    // Incrementar contador desnormalizado (para enforcement sin query extra)
    batch.update(adminDb.doc(`workspaces/${workspaceId}`), {
      customerCount: FieldValue.increment(1),
      updatedAt:     FieldValue.serverTimestamp(),
    })

    await batch.commit()

    // 5. Audit (fire-and-forget)
    writeAuditLog(workspaceId, user.uid, user.displayName, 'customer.created', {
      entityType: 'customer',
      entityId:   ref.id,
      after:      { nombre: input.nombre, tipo: input.tipo, estado: input.estado },
    })

    revalidatePath(`/workspace/${workspaceId}/clientes`)
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

    const { user, membership } = await requireMembership(workspaceId)
    requirePermission(membership.role, 'customer:update')

    const current = await getCustomerById(workspaceId, customerId)
    if (!current) return fail('Cliente no encontrado', 'NOT_FOUND')

    // Regenerar tokens si cambió nombre/teléfono/barrio
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
    if (input.email === '') updates.email = null
    if (input.telefono === '') updates.telefono = null

    await adminDb
      .doc(`workspaces/${workspaceId}/clientes/${customerId}`)
      .update(updates)

    writeAuditLog(workspaceId, user.uid, user.displayName, 'customer.updated', {
      entityType: 'customer',
      entityId:   customerId,
      before:     { nombre: current.nombre, estado: current.estado },
      after:      { nombre: input.nombre ?? current.nombre, estado: input.estado ?? current.estado },
    })

    revalidatePath(`/workspace/${workspaceId}/clientes`)
    revalidatePath(`/workspace/${workspaceId}/clientes/${customerId}`)
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
    const { user, membership } = await requireMembership(workspaceId)
    requirePermission(membership.role, 'customer:delete')

    const current = await getCustomerById(workspaceId, customerId)
    if (!current) return fail('Cliente no encontrado', 'NOT_FOUND')

    const batch = adminDb.batch()

    batch.delete(adminDb.doc(`workspaces/${workspaceId}/clientes/${customerId}`))

    batch.update(adminDb.doc(`workspaces/${workspaceId}`), {
      customerCount: FieldValue.increment(-1),
    })

    await batch.commit()

    writeAuditLog(workspaceId, user.uid, user.displayName, 'customer.deleted', {
      entityType: 'customer',
      entityId:   customerId,
      before:     { nombre: current.nombre, tipo: current.tipo },
    })

    revalidatePath(`/workspace/${workspaceId}/clientes`)
    return ok(undefined)

  } catch (err) {
    return handleActionError(err, 'deleteCustomer')
  }
}
