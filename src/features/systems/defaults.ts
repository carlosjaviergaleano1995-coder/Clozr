import type {
  SystemLabels,
  NavItem,
  PipelineStage,
  MetricDefinition,
  SystemFeatureFlags,
} from './types'

// ── LABELS POR DEFECTO ────────────────────────────────────────────────────────
// Se usan cuando no hay sistema activo

export const DEFAULT_LABELS: SystemLabels = {
  customer:     { singular: 'Cliente',    plural: 'Clientes'    },
  sale:         { singular: 'Venta',      plural: 'Ventas'      },
  pipelineItem: { singular: 'Seguimiento',plural: 'Seguimientos'},
  product:      { singular: 'Producto',   plural: 'Productos'   },
  createCustomer: 'Agregar cliente',
  createSale:     'Nueva venta',
  closeDeal:      'Cerrar',
  customerTypes: {
    final:      'Cliente final',
    revendedor: 'Revendedor',
    mayorista:  'Mayorista',
    empresa:    'Empresa',
  },
  paymentMethods: ['Efectivo', 'Transferencia', 'Tarjeta'],
}

// ── NAV POR DEFECTO ───────────────────────────────────────────────────────────

export const DEFAULT_NAV: NavItem[] = [
  { id: 'hoy',      label: 'Hoy',      icon: 'Sun',        route: { type: 'core', screen: 'hoy'      } },
  { id: 'clientes', label: 'Clientes', icon: 'Users',      route: { type: 'core', screen: 'clientes' } },
  { id: 'pipeline', label: 'Pipeline', icon: 'GitPullRequest', route: { type: 'core', screen: 'pipeline' } },
  { id: 'ventas',   label: 'Ventas',   icon: 'DollarSign', route: { type: 'core', screen: 'ventas'   } },
  { id: 'ajustes',  label: 'Ajustes',  icon: 'Settings',   route: { type: 'core', screen: 'ajustes'  } },
]

// ── ETAPAS POR DEFECTO ────────────────────────────────────────────────────────

export const DEFAULT_STAGES: PipelineStage[] = [
  { id: 'lead',     nombre: 'Lead',        order: 0, color: 'neutral' },
  { id: 'contacto', nombre: 'Contactado',  order: 1, color: 'blue'    },
  { id: 'propuesta',nombre: 'Propuesta',   order: 2, color: 'amber'   },
  { id: 'cierre',   nombre: 'Cerrado',     order: 3, color: 'green', isWon: true  },
  { id: 'perdido',  nombre: 'Perdido',     order: 4, color: 'red',   isLost: true },
]

// ── MÉTRICAS POR DEFECTO ──────────────────────────────────────────────────────

export const DEFAULT_METRICS: MetricDefinition[] = [
  { id: 'ventas_mes',    label: 'Ventas del mes',    type: 'count',  source: 'sales_count_period',   format: 'number'       },
  { id: 'pipeline_open', label: 'En seguimiento',    type: 'count',  source: 'pipeline_open_count',  format: 'number'       },
  { id: 'pipeline_won',  label: 'Cierres del mes',   type: 'count',  source: 'pipeline_won_count',   format: 'number'       },
]

// ── FEATURE FLAGS POR DEFECTO (todo desactivado) ──────────────────────────────

export const DEFAULT_FEATURE_FLAGS: SystemFeatureFlags = {
  hasBroadcast:            false,
  hasQuoter:               false,
  hasCommissionCalculator: false,
  hasMonthlyReport:        false,
  hasResellers:            false,
  hasBulkPricing:          false,
  hasDolarBlue:            false,
}
