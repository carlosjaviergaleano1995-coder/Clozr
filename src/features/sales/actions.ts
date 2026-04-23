import {
  collection, doc, setDoc, updateDoc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { ok, fail, handleActionError } from '@/lib/errors'
import type { ActionResult } from '@/lib/errors'

interface SaleInput {
  customerId?:   string
  customerName:  string
  pipelineItemId?: string
  items:         { descripcion: string; cantidad: number; precioUnitario: number; subtotal: number; catalogItemId?: string }[]
  subtotal:      number
  discount?:     number
  total:         number
  currency:      'ARS' | 'USD'
  formaPago:     string
  pagado:        boolean
  notas?:        string
  fecha?:        Date
  systemData?:   Record<string, unknown>
}

export async function createSale(
  workspaceId: string,
  input: SaleInput,
  userId?: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const ref  = doc(collection(db, `workspaces/${workspaceId}/ventas`))
    const now  = input.fecha ?? new Date()

    await setDoc(ref, {
      workspaceId,
      customerId:     input.customerId    ?? null,
      customerName:   input.customerName,
      pipelineItemId: input.pipelineItemId ?? null,
      items:          input.items,
      subtotal:       input.subtotal,
      discount:       input.discount      ?? null,
      total:          input.total,
      currency:       input.currency,
      formaPago:      input.formaPago,
      pagado:         input.pagado,
      pagadoAt:       input.pagado ? serverTimestamp() : null,
      systemData:     input.systemData    ?? null,
      notas:          input.notas         ?? null,
      fecha:          now,
      creadoPor:      userId              ?? '',
      createdAt:      serverTimestamp(),
      updatedAt:      serverTimestamp(),
    })

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
    await updateDoc(doc(db, `workspaces/${workspaceId}/ventas/${saleId}`), {
      pagado:    true,
      pagadoAt:  serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return ok(undefined)
  } catch (err) {
    return handleActionError(err, 'markSalePaid')
  }
}
