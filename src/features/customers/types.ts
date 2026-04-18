export type CustomerType   = 'final' | 'revendedor' | 'mayorista' | 'empresa'
export type CustomerStatus = 'activo' | 'potencial' | 'inactivo' | 'perdido'

export interface Customer {
  id: string
  workspaceId: string
  nombre: string
  telefono?: string
  email?: string
  tipo: CustomerType
  estado: CustomerStatus
  barrio?: string
  direccion?: string
  dni?: string
  referidoPor?: string          // id de otro Customer
  notas?: string
  // Desnormalizado — para cards sin join extra
  lastInteractionAt?: Date
  totalSales: number
  // Campos custom del sistema activo
  customFields?: Record<string, unknown>
  tags?: string[]
  // Tokens de búsqueda — generados al crear/editar
  searchTokens?: string[]
  creadoPor: string
  createdAt: Date
  updatedAt: Date
}
