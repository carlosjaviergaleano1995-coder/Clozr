export interface SaleItem {
  catalogItemId?: string
  descripcion: string
  cantidad: number
  precioUnitario: number
  subtotal: number
}

export interface Sale {
  id: string
  workspaceId: string
  customerId?: string
  customerName: string        // desnormalizado — el cliente puede borrarse
  pipelineItemId?: string
  items: SaleItem[]
  subtotal: number
  discount?: number
  total: number
  currency: 'ARS' | 'USD'
  formaPago: string           // libre, definida por el sistema o el usuario
  pagado: boolean
  pagadoAt?: Date
  systemData?: Record<string, unknown>
  notas?: string
  fecha: Date
  creadoPor: string
  createdAt: Date
  updatedAt: Date
}
