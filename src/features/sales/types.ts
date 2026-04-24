// ── Métodos de pago disponibles ───────────────────────────────────────────────
export type PaymentMethod =
  | 'efectivo_usd'
  | 'efectivo_ars'
  | 'transferencia'
  | 'usdt'
  | 'tarjeta'
  | 'cuotas'
  | 'otro'

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  efectivo_usd:  'Efectivo USD',
  efectivo_ars:  'Efectivo ARS',
  transferencia: 'Transferencia',
  usdt:          'USDT',
  tarjeta:       'Tarjeta',
  cuotas:        'Cuotas',
  otro:          'Otro',
}

// ── Un pago dentro de una venta (pueden ser varios) ───────────────────────────
export interface SalePayment {
  metodo:   PaymentMethod
  moneda:   'ARS' | 'USD'
  monto:    number
  esSena?:  boolean   // true si es seña/anticipo parcial
  notas?:   string
}

// ── Un item dentro de una venta ───────────────────────────────────────────────
export interface SaleItem {
  catalogItemId?:  string    // si viene del stock
  descripcion:     string
  cantidad:        number
  precioBase?:     number    // precio original de lista (para calcular descuento real)
  precioUnitario:  number    // precio efectivamente cobrado
  subtotal:        number
  imei?:           string    // IMEI específico si aplica
  desdeStock?:     boolean   // si true, decrementó stock al confirmar
}

// ── Venta canónica ────────────────────────────────────────────────────────────
export interface Sale {
  id:             string
  workspaceId:    string
  customerId?:    string
  customerName:   string          // desnormalizado (el cliente puede borrarse)
  pipelineItemId?: string

  // Items vendidos
  items:          SaleItem[]
  subtotal:       number
  discount?:      number
  total:          number

  // Pagos — puede haber múltiples
  pagos:          SalePayment[]
  totalPagado:    number          // suma de pagos ya realizados
  pagado:         boolean         // true si totalPagado >= total
  pagadoAt?:      Date
  saldo:          number          // total - totalPagado (0 si pagado)

  // Trazabilidad
  vendedorId:     string          // uid del vendedor
  vendedorNombre: string
  systemData?:    Record<string, unknown>
  notas?:         string
  fecha:          Date
  creadoPor:      string
  createdAt:      Date
  updatedAt:      Date

  // Campo legacy para compat con ventas viejas
  formaPago?:     string
  currency?:      'ARS' | 'USD'
}
