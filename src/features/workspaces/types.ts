// ── BASE CONFIG ───────────────────────────────────────────────────────────────
// Describe QUÉ hace el negocio — invariante, del onboarding.
// No mezcla features del sistema activo.

export interface WorkspaceBaseConfig {
  vendeProductos: boolean
  vendeServicios: boolean
  tieneOrdenes: boolean
  moneda: 'ARS' | 'USD' | 'mixed'
}

// ── SYSTEM FLAGS ──────────────────────────────────────────────────────────────
// Proyección/snapshot de SystemFeatureFlags del sistema activo.
// Se escribe al activar un sistema — se limpia al desactivar.
// Es Record genérico: el core no conoce qué sistemas existen.

export type WorkspaceSystemFlags = Record<string, boolean>

// ── WORKSPACE ─────────────────────────────────────────────────────────────────

export interface Workspace {
  id: string
  ownerId: string
  nombre: string
  emoji: string
  color: string

  // Config base del negocio — estable
  config: WorkspaceBaseConfig

  // Flags del sistema activo — variable
  systemFlags?: WorkspaceSystemFlags

  // Sistema activo
  activeSystemSlug?: string
  activeSystemActivatedAt?: Date
  activeSystemActivationCodeId?: string

  // Estado
  isActive: boolean

  // Contadores desnormalizados — para enforcement de límites sin queries extra
  customerCount: number
  memberCount: number

  createdAt: Date
  updatedAt: Date
}

// ── AGGREGATE SUMMARY ────────────────────────────────────────────────────────
// Documento único en /workspaces/{wid}/aggregate/summary
// Recalculado por Cloud Function en cada write de ventas/pipeline

export interface WorkspaceSummary {
  month: string                 // 'YYYY-MM'
  totalSalesCount: number
  totalRevenueARS: number
  totalRevenueUSD: number
  pipelineOpenCount: number
  pipelineWonCount: number
  pipelineLostCount: number
  customersCreatedCount: number
  updatedAt: Date
}
