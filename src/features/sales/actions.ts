'use server'

import { FieldValue } from 'firebase-admin/firestore'
import { revalidatePath } from 'next/cache'
import { adminDb } from '@/server/firebase-admin'
import { requireMembership } from '@/server/auth'
import { requirePermission } from '@/server/permissions'
import { writeAuditLog } from '@/server/audit'
import { CreateSaleSchema } from './schemas'
import { ok, fail, handleActionError, parseZodError } from '@/lib/errors'
import type { ActionResult } from '@/lib/errors'

export async function createSale(
  workspaceId: string,
  rawInput: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const result = CreateSaleSchema.safeParse(rawInput)
    if (!result.success) {
      return fail('Datos inválidos', 'VALIDATION_ERROR', parseZodError(result.error))
    }
    const input = result.data

    const { user, membership } = await requireMembership(workspaceId)
    requirePermission(membership.role, 'sale:create')

    const ref = adminDb.collection(`workspaces/${workspaceId}/ventas`).doc()

    const batch = adminDb.batch()

    batch.set(ref, {
      workspaceId,
      customerId:     input.customerId     ?? null,
      customerName:   input.customerName,
      pipelineItemId: input.pipelineItemId ?? null,
      items:          input.items,
      subtotal:       input.subtotal,
      discount:       input.discount       ?? null,
      total:          input.total,
      currency:       input.currency,
      formaPago:      input.formaPago,
      pagado:         input.pagado,
      pagadoAt:       input.pagado ? FieldValue.serverTimestamp() : null,
      systemData:     input.systemData     ?? null,
      notas:          input.notas          ?? null,
      fecha:          input.fecha,
      creadoPor:      user.uid,
      createdAt:      FieldValue.serverTimestamp(),
      updatedAt:      FieldValue.serverTimestamp(),
    })

    // Actualizar totalSales del cliente
    if (input.customerId) {
      batch.update(
        adminDb.doc(`workspaces/${workspaceId}/customers/${input.customerId}`),
        {
          totalSales:           FieldValue.increment(input.total),
          lastInteractionAt:    FieldValue.serverTimestamp(),
          updatedAt:            FieldValue.serverTimestamp(),
        },
      )
    }

    await batch.commit()

    writeAuditLog(workspaceId, user.uid, user.displayName, 'sale.created', {
      entityType: 'sale',
      entityId:   ref.id,
      after: { total: input.total, currency: input.currency, customerName: input.customerName },
    })

    revalidatePath(`/workspace/${workspaceId}/ventas`)
    return ok({ id: ref.id })

  } catch (err) {
    return handleActionError(err, 'createSale')
  }
}

export async function markSalePaid(
  workspaceId: string,
  saleId: string,
): Promise<ActionResult> {
  try {
    const { user, membership } = await requireMembership(workspaceId)
    requirePermission(membership.role, 'sale:update')

    await adminDb.doc(`workspaces/${workspaceId}/ventas/${saleId}`).update({
      pagado:   true,
      pagadoAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    revalidatePath(`/workspace/${workspaceId}/ventas`)
    return ok(undefined)

  } catch (err) {
    return handleActionError(err, 'markSalePaid')
  }
}
