// ── USUARIO ──
export interface User {
  uid: string
  email: string
  displayName: string
  photoURL?: string
  createdAt: Date
}

// ── WORKSPACE ──
export type WorkspaceType = 'servicios' | 'productos' | 'mixto'

export interface Workspace {
  id: string
  nombre: string
  tipo: WorkspaceType
  emoji: string
  color: string
  ownerId: string
  miembros: string[]
  config: WorkspaceConfig
  createdAt: Date
  updatedAt: Date
}

export interface WorkspaceConfig {
  // Servicios (ej: Verisure)
  tieneComisiones?: boolean
  tieneBonos?: boolean
  tieneCuotas?: boolean
  tieneIVA?: boolean
  // Productos (ej: iPhone Club)
  tieneStock?: boolean
  tieneUsados?: boolean
  tieneVolumen?: boolean
  moneda?: 'ARS' | 'USD' | 'ambas'
  // Shared
  tieneWhatsApp?: boolean
  tieneTareas?: boolean
}

// ── CLIENTE ──
export type ClienteTipo = 'final' | 'revendedor' | 'mayorista' | 'empresa'
export type ClienteEstado = 'activo' | 'dormido' | 'potencial' | 'perdido'

export interface Cliente {
  id: string
  workspaceId: string
  nombre: string
  telefono?: string
  email?: string
  direccion?: string
  tipo: ClienteTipo
  estado: ClienteEstado
  notas?: string
  ultimoContacto?: Date
  creadoPor: string
  createdAt: Date
  updatedAt: Date
}

// ── CATÁLOGO ──
export type ProductoCondicion = 'nuevo' | 'usado' | 'reacondicionado'

export interface Producto {
  id: string
  workspaceId: string
  nombre: string
  categoria: string
  condicion: ProductoCondicion
  // Precios
  precioFinal?: number      // precio cliente final
  precioRevendedor?: number // precio revendedor
  precioMayorista?: number  // precio mayorista
  moneda: 'ARS' | 'USD'
  // Stock
  stockActual?: number
  // Para usados
  bateria?: number   // porcentaje
  ciclos?: number
  color?: string
  storage?: string
  // Para servicios
  esCuota?: boolean
  cuotaMensual?: number
  // Meta
  activo: boolean
  createdAt: Date
  updatedAt: Date
}

// ── VENTA ──
export type VentaEstado = 'presupuesto' | 'pendiente' | 'cerrada' | 'cancelada'

export interface VentaItem {
  productoId: string
  productoNombre: string
  cantidad: number
  precioUnitario: number
  moneda: 'ARS' | 'USD'
  bonificado?: boolean
}

export interface Venta {
  id: string
  workspaceId: string
  clienteId: string
  clienteNombre: string
  items: VentaItem[]
  subtotal: number
  iva?: number
  total: number
  moneda: 'ARS' | 'USD'
  formaPago?: string
  estado: VentaEstado
  notas?: string
  creadoPor: string
  createdAt: Date
  updatedAt: Date
}

// ── TAREAS ──
export type TareaFrecuencia = 'diaria' | 'semanal' | 'unica'

export interface Tarea {
  id: string
  workspaceId: string
  titulo: string
  descripcion?: string
  frecuencia: TareaFrecuencia
  completada: boolean
  fechaCompletada?: Date
  orden: number
  createdAt: Date
}

// ── PRESUPUESTO (para servicios) ──
export interface Presupuesto {
  id: string
  workspaceId: string
  clienteId?: string
  clienteNombre: string
  items: VentaItem[]
  total: number
  cuotaMensual?: number
  cuotas?: number
  comision?: number
  notas?: string
  creadoPor: string
  createdAt: Date
}

// ── VERISURE ──
export type NivelPrecio = 'catalogo' | 'alto' | 'medio' | 'bajo' | 'jefe' | 'gerente'
export type TipoVenta = 'RE' | 'RP'
export type NivelDispositivo = 'alto' | 'bajo'

export interface PreciosKitVerisure {
  catalogo: number
  alto: number
  medio: number
  bajo: number
  jefe: number
  gerente: number
}

export interface ComisionesKitVerisure {
  catalogo_RE: number
  catalogo_RP: number
  alto_RE: number
  alto_RP: number
  medio_RE: number
  medio_RP: number
  bajo_RE: number
  bajo_RP: number
}

export interface UpgradeVerisure {
  catalogo: number
  alto: number
  medioBajo: number
  cuotaAdicional: number
}

export interface PromoVerisure {
  id: string
  label: string
  precio: number
  descripcion: string
  activa: boolean
}

export interface DispositivoExtra {
  id: string
  nombre: string
  nivel: NivelDispositivo | 'ambos'
  precios: number[]        // [x1, x2, x3, x4, x6] — 0 si no aplica
  cuotas: number[]         // [x1, x2, x3, x4, x6]
  comisiones: number[]     // [x1, x2, x3, x4, x6]
  cantidades: number[]     // ej [1,2,3,4,6]
}

export interface ConfigVerisure {
  cuotaBase: number         // 62.999
  cuotaUpgrade: number      // 5.999
  ivaPct: number            // 21
  kits: PreciosKitVerisure
  upgrades: UpgradeVerisure
  comisiones: ComisionesKitVerisure
  promos: PromoVerisure[]
  dispositivos: DispositivoExtra[]
  // Bonos
  bonoPerformance: { ventas: number; monto: number }[]
  bonoPerformanceExtra: number
  bonoRP: { rp: number; monto: number }[]
  bonoRPExtra: number
  bonoExpress: { express: number; monto: number }[]
  bonoInstalacionRP: number
  bonoInstalacionJefeGerente: number
  xvenConCertificado: number
  xvenSinCertificado: number
}

// ── IPHONE CLUB ──────────────────────────────────────────────────────────────

export type AppleCategoria = 'iphone' | 'accesorio' | 'otro_apple'
export type AppleCondicion = 'nuevo' | 'usado'
export type FormaPagoIC = 'usd_efectivo' | 'usdt' | 'transferencia_ars' | 'manchados'

// Dólar blue — guardado en Firestore, actualizable manualmente o por API
export interface DolarConfig {
  valor: number           // ej: 1200
  actualizadoAt: Date
  modoManual: boolean     // true = no auto-actualizar
}

// ── iPhone (nuevo y usado) ────────────────────────────────────────────────────
export interface StockIPhone {
  id: string
  workspaceId: string
  modelo: string          // ej: "iPhone 16"
  storage: string         // ej: "128GB"
  color: string           // ej: "BLACK"
  condicion: AppleCondicion
  precioUSD: number       // precio base (mayorista)
  stock: number           // unidades disponibles
  // Solo para usados
  bateria?: number        // porcentaje
  ciclos?: number
  observaciones?: string  // ej: "Pantalla Cambiada"
  activo: boolean
  createdAt: Date
  updatedAt: Date
}

// ── Accesorio (cargadores, cables, fundas) ────────────────────────────────────
export interface PrecioVolumen {
  cantidad: number        // ej: 10
  precio: number          // en ARS
}

export interface StockAccesorio {
  id: string
  workspaceId: string
  nombre: string          // ej: "Cable USB a Lightning"
  categoria: string       // ej: "cables" | "cargadores" | "fundas"
  descripcion?: string    // ej: "C a C Mallado"
  preciosVolumen: PrecioVolumen[]  // escala de precios
  moneda: 'ARS' | 'USD'
  stock: number
  activo: boolean
  createdAt: Date
  updatedAt: Date
}

// ── Otro Apple (Watch, iPad, AirPods, AirTag) ─────────────────────────────────
export interface StockOtroApple {
  id: string
  workspaceId: string
  tipo: 'watch' | 'ipad' | 'airpods' | 'airtag' | 'otro'
  modelo: string          // ej: "Apple Watch SE2 44MM"
  descripcion?: string    // ej: "Midnight"
  precioUSD: number
  stock: number
  disponible: boolean     // false = "próximo ingreso"
  activo: boolean
  createdAt: Date
  updatedAt: Date
}

// ── Revendedor ────────────────────────────────────────────────────────────────
export type RevendedorEstado = 'activo' | 'dormido' | 'potencial' | 'inactivo'

export interface Revendedor {
  id: string
  workspaceId: string
  nombre: string
  telefono?: string
  instagram?: string
  zona?: string           // ej: "La Plata", "CABA"
  estado: RevendedorEstado
  notas?: string
  ultimoContacto?: Date
  volumenMensual?: number // USD estimado por mes
  creadoPor: string
  createdAt: Date
  updatedAt: Date
}

// ── Config iPhone Club ────────────────────────────────────────────────────────
export interface ConfigIPhoneClub {
  margenFinal: number     // USD sobre precio base para cliente final (default: 20)
  formasPago: {
    usdt: number              // modificador % (default: -0.5)
    transferencia_ars: number // default: +5
    manchados: number         // default: -10
  }
  pieTextoUsados: string  // texto fijo al pie del broadcast usados
  pieTextoNuevos: string  // texto fijo al pie del broadcast nuevos
  dolar: DolarConfig
}
