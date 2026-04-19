// ── SALES ADAPTER ─────────────────────────────────────────────────────────────
// Traduce documentos legacy al modelo Sale canónico.
//
// COLECCIONES LEGACY:
//   'ventas'         → Venta vieja (VentaEstado: presupuesto/pendiente/cerrada/cancelada)
//   'ventas2'        → Venta2 (Venta iPhone Club simplificada, sin items detallados)
//   'ventas_iphone'  → VentaIPhone (ventas iPhone Club con precios USD)
//
// COLECCIÓN CANÓNICA: workspaces/{wid}/ventas (reutilizada, mismo nombre)
// MODELO CANÓNICO: Sale (features/sales/types.ts)
//
// Escritura nueva: usa Sale con pagado:boolean en lugar de estado:VentaEstado

import type { Sale, SaleItem } from './types'

function toDate(val: any): Date {
  if (!val) return new Date()
  if (val instanceof Date) return val
  if (typeof val.toDate === 'function') return val.toDate()
  return new Date(val)
}

// ── adaptVentaDoc ──────────────────────────────────────────────────────────────
// Detecta si es legacy (tiene 'estado') o nuevo (tiene 'pagado')

export function adaptVentaDoc(docId: string, data: Record<string, unknown>): Sale {
  if ('estado' in data) {
    return adaptLegacyVenta(docId, data)
  }
  return adaptNewSale(docId, data)
}

function adaptLegacyVenta(docId: string, data: any): Sale {
  const estado  = data.estado ?? 'cerrada'
  const pagado  = estado === 'cerrada'
  const items: SaleItem[] = (data.items ?? []).map((item: any) => ({
    catalogItemId:   item.productoId,
    descripcion:     item.productoNombre ?? item.descripcion ?? '',
    cantidad:        item.cantidad ?? 1,
    precioUnitario:  item.precioUnitario ?? 0,
    subtotal:        (item.cantidad ?? 1) * (item.precioUnitario ?? 0),
  }))

  const fecha = toDate(data.createdAt)

  return {
    id:           docId,
    workspaceId:  data.workspaceId ?? '',
    customerId:   data.clienteId   || undefined,
    customerName: data.clienteNombre ?? 'Sin cliente',
    pipelineItemId: undefined,
    items:        items.length > 0 ? items : [{
      descripcion:    data.clienteNombre ?? 'Venta',
      cantidad:       1,
      precioUnitario: data.total ?? 0,
      subtotal:       data.total ?? 0,
    }],
    subtotal:   data.subtotal ?? data.total ?? 0,
    discount:   undefined,
    total:      data.total ?? 0,
    currency:   (data.moneda ?? 'ARS') as 'ARS' | 'USD',
    formaPago:  data.formaPago ?? 'Efectivo',
    pagado,
    pagadoAt:   pagado ? fecha : undefined,
    systemData: { _legacyEstado: estado },
    notas:      data.notas,
    fecha,
    creadoPor:  data.creadoPor ?? '',
    createdAt:  fecha,
    updatedAt:  toDate(data.updatedAt ?? data.createdAt),
  }
}

function adaptNewSale(docId: string, data: any): Sale {
  const items: SaleItem[] = (data.items ?? []).map((item: any) => ({
    catalogItemId:   item.catalogItemId,
    descripcion:     item.descripcion ?? '',
    cantidad:        item.cantidad ?? 1,
    precioUnitario:  item.precioUnitario ?? 0,
    subtotal:        item.subtotal ?? 0,
  }))

  return {
    id:           docId,
    workspaceId:  data.workspaceId ?? '',
    customerId:   data.customerId   || undefined,
    customerName: data.customerName ?? 'Sin cliente',
    pipelineItemId: data.pipelineItemId,
    items,
    subtotal:   data.subtotal ?? 0,
    discount:   data.discount,
    total:      data.total ?? 0,
    currency:   (data.currency ?? 'ARS') as 'ARS' | 'USD',
    formaPago:  data.formaPago ?? '',
    pagado:     data.pagado ?? true,
    pagadoAt:   data.pagadoAt ? toDate(data.pagadoAt) : undefined,
    systemData: data.systemData,
    notas:      data.notas,
    fecha:      toDate(data.fecha ?? data.createdAt),
    creadoPor:  data.creadoPor ?? '',
    createdAt:  toDate(data.createdAt),
    updatedAt:  toDate(data.updatedAt),
  }
}

// ── Helpers de presentación ────────────────────────────────────────────────────

export function isPagada(sale: Sale): boolean {
  return sale.pagado
}

export function getLegacyEstado(sale: Sale): string {
  return (sale.systemData?._legacyEstado as string) ?? (sale.pagado ? 'cerrada' : 'pendiente')
}
