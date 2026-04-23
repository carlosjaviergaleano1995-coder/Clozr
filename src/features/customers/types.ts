import type { PricingPolicy } from './schemas'
export type { PricingPolicy }

export type CustomerType   = 'final' | 'revendedor' | 'mayorista' | 'empresa'
export type CustomerStatus = 'activo' | 'potencial' | 'dormido' | 'inactivo' | 'perdido'

export interface Customer {
  id:          string
  workspaceId: string
  nombre:      string
  telefono?:   string
  email?:      string
  tipo:        CustomerType
  estado:      CustomerStatus
  barrio?:     string
  direccion?:  string
  dni?:        string
  referido?:   string      // legacy: nombre string
  referidoPor?: string     // nuevo: id del cliente que refirió
  notas?:      string
  lastInteractionAt?: Date
  totalSales:  number
  customFields?: Record<string, unknown>
  tags?:        string[]
  searchTokens?: string[]
  creadoPor:   string
  createdAt:   Date
  updatedAt:   Date

  // ── Política de precios personalizada ─────────────────────────────────────
  // Se aplica automáticamente al venderle a este cliente.
  // Variantes: 'fixed' (precio fijo), 'percentage' (% sobre lista), 'volume' (escalonado)
  pricingPolicy?: PricingPolicy
}

// ── Helpers para calcular precio con política ─────────────────────────────────

export function applyPricingPolicy(
  basePrice: number,
  policy:    PricingPolicy | undefined,
  quantity:  number = 1,
): number {
  if (!policy) return basePrice

  switch (policy.type) {
    case 'fixed': {
      // Si hay precio para '*' usarlo como fallback general
      return policy.prices['*'] ?? basePrice
    }
    case 'percentage': {
      return basePrice * (1 + policy.percentage / 100)
    }
    case 'volume': {
      // Buscar el tier que aplica (mayor minQty que sea <= quantity)
      const applicable = [...policy.tiers]
        .filter(t => t.minQty <= quantity)
        .sort((a, b) => b.minQty - a.minQty)[0]
      if (!applicable) return basePrice
      return basePrice * (1 + applicable.percentage / 100)
    }
    default:
      return basePrice
  }
}

export function applyPricingPolicyForItem(
  basePrice:    number,
  policy:       PricingPolicy | undefined,
  catalogItemId: string | undefined,
  quantity:     number = 1,
): number {
  if (!policy) return basePrice
  if (policy.type === 'fixed' && catalogItemId && catalogItemId in policy.prices) {
    return policy.prices[catalogItemId]
  }
  return applyPricingPolicy(basePrice, policy, quantity)
}

// Descripción legible de la política (para mostrar en UI)
export function describePricingPolicy(policy: PricingPolicy): string {
  switch (policy.type) {
    case 'fixed':
      return 'Precio fijo por producto'
    case 'percentage': {
      const pct = policy.percentage
      if (pct === 0) return 'Sin modificador'
      if (pct < 0)   return `Descuento ${Math.abs(pct)}% sobre lista`
      return `Recargo ${pct}% sobre lista`
    }
    case 'volume': {
      const sorted = [...policy.tiers].sort((a, b) => a.minQty - b.minQty)
      const desc   = sorted.map(t =>
        `${t.minQty}+ u: ${t.percentage >= 0 ? '+' : ''}${t.percentage}%`
      ).join(', ')
      return `Por volumen: ${desc}`
    }
  }
}
