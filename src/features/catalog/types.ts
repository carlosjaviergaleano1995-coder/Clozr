export interface CatalogItem {
  id: string
  workspaceId: string
  categoria: string
  subcategoria: string
  nombre: string
  precio?: number
  currency?: 'ARS' | 'USD'
  activo: boolean
  orden: number
  systemData?: Record<string, unknown>
  createdAt: Date
}

export interface CatalogSubcategory {
  id: string
  workspaceId: string
  categoria: string
  nombre: string
  emoji: string
  activo: boolean
  orden: number
  createdAt: Date
}
