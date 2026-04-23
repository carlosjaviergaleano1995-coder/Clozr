export interface CatalogItem {
  id:          string
  workspaceId: string
  categoria:   string
  subcategoria: string
  nombre:      string
  precio?:     number
  currency?:   'ARS' | 'USD'
  activo:      boolean
  orden:       number
  systemData?: Record<string, unknown>
  createdAt:   Date

  // ── Stock ────────────────────────────────────────────────────────────────
  // trackStock: si true, descuenta unidades al vender
  // stock: unidades disponibles (entero)
  // imei: lista de IMEIs disponibles (array vacío si no aplica)
  trackStock?: boolean
  stock?:      number
  imei?:       string[]
}

export interface CatalogSubcategory {
  id:          string
  workspaceId: string
  categoria:   string
  nombre:      string
  emoji:       string
  activo:      boolean
  orden:       number
  createdAt:   Date
}

// Resultado de buscar items disponibles para venta
export interface CatalogItemForSale extends CatalogItem {
  disponible:   number    // stock disponible (si trackStock = true)
  sinStock:     boolean   // true si trackStock && stock === 0
}
