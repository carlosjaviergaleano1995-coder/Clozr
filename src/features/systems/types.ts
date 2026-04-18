// ── SALES SYSTEM DEFINITION ───────────────────────────────────────────────────
// Contrato técnico que define cómo un sistema especializa un workspace.
// REGLA: requiredPlan NO existe aquí — el plan controla el cuánto,
// el sistema controla el cómo. Restricciones comerciales viven en el marketplace.

// ── IDENTIDAD ─────────────────────────────────────────────────────────────────

export type IndustriaSlug =
  | 'seguridad'
  | 'tecnologia'
  | 'inmobiliaria'
  | 'salud'
  | 'gastronomia'
  | 'servicios_tecnicos'
  | 'educacion'
  | 'otro'

// Solo nombres de íconos de Lucide React — el core conoce este catálogo
export type IconSlug = string

export type StageColor = 'neutral' | 'blue' | 'amber' | 'green' | 'red' | 'purple'

// ── VOCABULARIO ───────────────────────────────────────────────────────────────

export interface LabelPair {
  singular: string
  plural: string
}

export interface SystemLabels {
  customer:     LabelPair        // 'Cliente' / 'Clientes' | 'Prospecto' / 'Prospectos'
  sale:         LabelPair        // 'Venta' | 'Instalación'
  pipelineItem: LabelPair        // 'Deal' | 'Seguimiento'
  product?:     LabelPair        // 'Producto' | 'Kit'
  createCustomer: string         // 'Agregar cliente' | 'Agregar prospecto'
  createSale:     string         // 'Nueva venta' | 'Registrar instalación'
  closeDeal:      string         // 'Cerrar' | 'Marcar como instalado'
  customerTypes?: Record<string, string>  // { final: 'Cliente final', ... }
  paymentMethods?: string[]
}

// ── NAVEGACIÓN ────────────────────────────────────────────────────────────────

export type CoreScreen =
  | 'hoy'
  | 'clientes'
  | 'pipeline'
  | 'ventas'
  | 'catalogo'
  | 'tareas'
  | 'equipo'
  | 'ajustes'

export type NavRoute =
  | { type: 'core'; screen: CoreScreen }
  | { type: 'tool'; toolId: string }

export interface NavItem {
  id: string
  label: string
  icon: IconSlug
  route: NavRoute
  badge?: {
    type: 'count'
    source: 'pipeline_inactive_7d' | 'pipeline_inactive_14d' | 'tasks_due_today'
  }
}

export interface NavDefinition {
  items: NavItem[]   // máximo 5 — regla dura del layout
}

// ── PIPELINE ──────────────────────────────────────────────────────────────────

export interface PipelineStage {
  id: string
  nombre: string
  order: number
  color: StageColor
  isWon?: boolean
  isLost?: boolean
}

export interface PipelineDefinition {
  stages: PipelineStage[]
  wonStageId: string
  lostStageId: string
  inactivityAlerts: {
    warnAfterDays: number      // default 7
    criticalAfterDays: number  // default 14
  }
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────

export type MetricFormat = 'currency_ars' | 'currency_usd' | 'number' | 'percentage'

export type MetricSource =
  | 'sales_total_period'
  | 'sales_count_period'
  | 'pipeline_open_count'
  | 'pipeline_won_count'
  | 'formula'

export interface MetricDefinition {
  id: string
  label: string
  type: 'sum' | 'count' | 'formula'
  source: MetricSource
  formulaId?: string
  format: MetricFormat
}

export interface DashboardDefinition {
  metrics: MetricDefinition[]    // máximo 4
  quickActions: {
    label: string
    icon: IconSlug
    route: NavRoute
  }[]
}

// ── CAMPOS CUSTOM ─────────────────────────────────────────────────────────────

export type CustomFieldType = 'text' | 'number' | 'select' | 'boolean' | 'date'

export interface CustomFieldDef {
  id: string
  label: string
  type: CustomFieldType
  options?: string[]
  required?: boolean
  showInCard?: boolean
  showInDetail?: boolean
}

// ── HERRAMIENTAS ──────────────────────────────────────────────────────────────

export interface ToolDefinition {
  id: string
  toolId: string                      // clave en TOOL_REGISTRY — debe existir en el código
  label: string
  icon: IconSlug
  config?: Record<string, unknown>    // parámetros para la herramienta preconstruida
}

// ── FÓRMULAS DECLARATIVAS ─────────────────────────────────────────────────────
// Sin eval, sin código arbitrario — solo expresiones declarativas con whitelist

export interface FormulaVariable {
  id: string
  label: string
  type: 'number' | 'select' | 'boolean'
  options?: { value: number; label: string }[]
  defaultValue?: number | string | boolean
}

export interface FormulaDefinition {
  id: string
  nombre: string
  expression: string           // mini DSL: IF, ROUND, MIN, MAX, +, -, *, /
  variables: FormulaVariable[]
  outputFormat: MetricFormat
}

// ── FEATURE FLAGS ─────────────────────────────────────────────────────────────
// Se copian en WorkspaceSystemFlags al activar el sistema.
// El core lee systemFlags — nunca lee el SystemDefinition para decidir UI.

export interface SystemFeatureFlags {
  hasBroadcast:             boolean
  hasQuoter:                boolean
  hasCommissionCalculator:  boolean
  hasMonthlyReport:         boolean
  hasResellers:             boolean
  hasBulkPricing:           boolean
  hasDolarBlue:             boolean
}

// ── CONTRATO COMPLETO ─────────────────────────────────────────────────────────

export interface SalesSystemDefinition {
  slug:        string
  version:     string
  nombre:      string
  descripcion: string
  industria:   IndustriaSlug
  emoji:       string
  accentColor: string        // hex dentro de paleta permitida
  autor:       string

  // requiredPlan AUSENTE — el plan controla el cuánto, no el sistema
  // marketplaceConfig vive en SystemDefinitionDoc, no en el contrato técnico

  labels:         SystemLabels
  nav:            NavDefinition
  pipeline:       PipelineDefinition
  dashboard:      DashboardDefinition
  summary?:       { metrics: MetricDefinition[] }

  customerFields?:  CustomFieldDef[]
  saleFields?:      CustomFieldDef[]
  pipelineFields?:  CustomFieldDef[]

  salesConfig: {
    defaultCurrency:     'ARS' | 'USD' | 'mixed'
    paymentMethods:      string[]
    requiresCustomer:    boolean
    requiresCatalogItem: boolean
    allowManualItems:    boolean
  }

  catalogConfig?: {
    categories: {
      id: string
      nombre: string
      emoji: string
      subcategories: string[]
    }[]
    defaultCurrency: 'ARS' | 'USD'
    hasBulkPricing:  boolean
  }

  tools:     ToolDefinition[]
  formulas?: FormulaDefinition[]
  features:  SystemFeatureFlags

  compatibility: {
    minClozrVersion:  string
    requiredModules:  string[]
  }
}

// ── DOC DE FIRESTORE ──────────────────────────────────────────────────────────
// Lo que vive en /system_definitions/{slug}
// Incluye datos del marketplace separados del contrato técnico

export interface SystemDefinitionDoc {
  id:          string
  slug:        string
  version:     string
  nombre:      string
  descripcion: string
  industria:   IndustriaSlug
  emoji:       string
  color:       string
  autor:       string
  precio?:     number
  activo:      boolean
  definition:  SalesSystemDefinition   // el contrato técnico completo
  marketplaceConfig?: {
    minPlanToPurchase?: import('@/features/billing/types').PlanTier
    // Restricción de VENTA, no de uso
  }
  createdAt:   Date
  publishedAt?: Date
}

// ── ACTIVATION CODE ───────────────────────────────────────────────────────────

export type ActivationCodeStatus = 'available' | 'activated' | 'revoked' | 'expired'

export interface ActivationCode {
  id: string
  code: string                          // 'VRS-A3F9-X2024' — único, indexado
  systemSlug: string
  systemVersion: string
  status: ActivationCodeStatus
  activatedByUid?: string
  activatedAtWorkspaceId?: string
  activatedAt?: Date
  workspaceSnapshot?: { nombre: string; ownerId: string }
  createdByUid: string
  createdAt: Date
  expiresAt?: Date
  revokedAt?: Date
  revokedByUid?: string
  revokedReason?: string
  notes?: string
}
