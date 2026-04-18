// CustomerStatus incluye 'dormido' para compatibilidad con datos existentes
export type CustomerType   = 'final' | 'revendedor' | 'mayorista' | 'empresa'
export type CustomerStatus = 'activo' | 'potencial' | 'dormido' | 'inactivo' | 'perdido'

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
  // Campo viejo: 'referido' (nombre string). Campo nuevo: 'referidoPor' (id).
  // Ambos opcionales para compatibilidad
  referido?: string
  referidoPor?: string
  notas?: string
  lastInteractionAt?: Date
  totalSales: number
  customFields?: Record<string, unknown>
  tags?: string[]
  searchTokens?: string[]
  creadoPor: string
  createdAt: Date
  updatedAt: Date
}
