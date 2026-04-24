import {
  collection, doc, setDoc, updateDoc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { decrementStock } from '@/features/catalog/actions'
import { ok, fail, handleActionError } from '@/lib/errors'
import type { ActionResult } from '@/lib/errors'
import type { SaleItem, SalePayment } from './types'

export interface CreateSaleInput {
  customerId?:    string
  customerName:   string
  vendedorId?:    string
  vendedorNombre?: string
  items:          SaleItem[]
  pagos:          SalePayment[]
  notas?:         string
  fecha?:         Date
  systemData?:    Record<string, unknown>
  // compat legacy
  subtotal?:      number
  total?:         number
  currency?:      'ARS' | 'USD'
  formaPago?:     string
  pagado?:        boolean
}

export async function createSale(
  workspaceId: string,
  input: CreateSaleInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    // Calcular totales
    const subtotal    = input.items.reduce((s, i) => s + i.subtotal, 0)
    const totalPagado = input.pagos.reduce((s, p) => s + p.monto, 0)
    const total       = input.total ?? subtotal
    const pagado      = totalPagado >= total
    const saldo       = Math.max(0, total - totalPagado)

    // Descontar stock para items que vienen del catálogo
    for (const item of input.items) {
      if (item.desdeStock && item.catalogItemId) {
        await decrementStock(workspaceId, item.catalogItemId, item.cantidad, item.imei)
      }
    }

    const ref = doc(collection(db, `workspaces/${workspaceId}/ventas`))
    await setDoc(ref, {
      workspaceId,
      customerId:     input.customerId    ?? null,
      customerName:   input.customerName,
      vendedorId:     input.vendedorId    ?? '',
      vendedorNombre: input.vendedorNombre ?? '',
      items:          input.items,
      subtotal,
      total,
      pagos:          input.pagos,
      totalPagado,
      pagado,
      saldo,
      pagadoAt:       pagado ? serverTimestamp() : null,
      notas:          input.notas         ?? null,
      fecha:          input.fecha         ?? new Date(),
      systemData:     input.systemData    ?? null,
      // compat legacy
      currency:       input.currency      ?? 'ARS',
      formaPago:      input.formaPago     ?? (input.pagos[0] ? `${input.pagos[0].metodo}` : 'otro'),
      creadoPor:      input.vendedorId    ?? '',
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
  saleId:      string,
): Promise<ActionResult> {
  try {
    await updateDoc(doc(db, `workspaces/${workspaceId}/ventas/${saleId}`), {
      pagado:    true,
      saldo:     0,
      pagadoAt:  serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return ok(undefined)
  } catch (err) {
    return handleActionError(err, 'markSalePaid')
  }
}
