// ── TOOL REGISTRY ─────────────────────────────────────────────────────────────
// Source of truth de las herramientas preconstruidas de Clozr.
//
// REGLAS:
// 1. Ningún tool ID contiene nombres de marcas (no 'iphone-*', no 'verisure-*')
// 2. Los IDs son genéricos y reutilizables entre sistemas
// 3. Solo las herramientas aquí registradas pueden activarse — nunca código remoto
// 4. Para agregar una herramienta: crear el componente, importarlo, registrarlo.
//    No hay otro camino.

import type { RegisteredTool } from './types'

// ── Imports lazy — no se cargan hasta que se usen ─────────────────────────────
// Se usan React.lazy en la página de tool para code splitting real.
// Acá solo el registry estático de qué existe.

import { GenericSummary }        from './common/GenericSummary'
import { CommissionCalculator }  from './service-sales/CommissionCalculator'
import { PriceBroadcaster }      from './inventory-sales/PriceBroadcaster'
import { ProductQuoter }         from './inventory-sales/ProductQuoter'

export const TOOL_REGISTRY: Record<string, RegisteredTool> = {
  // ── Comunes ──────────────────────────────────────────────────────────────
  'generic-summary': {
    component:    GenericSummary,
    label:        'Resumen mensual',
    requiredFlag: 'hasMonthlyReport',
  },

  // ── Servicios en campo ────────────────────────────────────────────────────
  'commission-calculator': {
    component:    CommissionCalculator,
    label:        'Calculadora de comisiones',
    requiredFlag: 'hasCommissionCalculator',
  },

  // ── Inventario / productos ────────────────────────────────────────────────
  'price-broadcaster': {
    component:    PriceBroadcaster,
    label:        'Broadcast de precios',
    requiredFlag: 'hasBroadcast',
  },

  'product-quoter': {
    component:    ProductQuoter,
    label:        'Cotizador',
    requiredFlag: 'hasQuoter',
  },
} as const

export type RegisteredToolId = keyof typeof TOOL_REGISTRY

export function getTool(toolId: string): RegisteredTool | null {
  return TOOL_REGISTRY[toolId] ?? null
}

export function isRegisteredTool(toolId: string): toolId is RegisteredToolId {
  return toolId in TOOL_REGISTRY
}
