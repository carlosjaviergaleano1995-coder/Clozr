// ── USUARIO ──
export interface User {
  uid: string
  email: string
  displayName: string
  photoURL?: string
  createdAt: Date
}

// ── NEGOCIO (agrupa workspaces) ──────────────────────────────────────────────
export interface Negocio {
  id: string
  nombre: string
  emoji: string
  color: string
  ownerId: string
  miembros: string[]
  createdAt: Date
  updatedAt: Date
}

export type WorkspaceType = 'servicios' | 'productos' | 'mixto' | 'tecnico'

export interface Workspace {
  id: string
  negocioId?: string
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
  // Respuestas del onboarding — determinan qué módulos se activan
  vendeProductos?: boolean      // ¿vendés productos físicos?
  vendeServicios?: boolean      // ¿vendés servicios / trabajos?
  tieneStock?: boolean          // ¿manejás stock?
  tieneOrdenes?: boolean        // ¿hacés reparaciones / OTs?
  // Módulos opcionales activables
  moduloVerisure?: boolean      // calculadora Verisure
  moduloBroadcast?: boolean     // broadcast WhatsApp
  moduloRevendedores?: boolean  // CRM revendedores
  // Preferencias
  moneda?: 'ARS' | 'USD' | 'ambas'
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

// ════════════════════════════════════════════════════════════════════════════
// SISTEMA DE INVENTARIO UNIFICADO
// ════════════════════════════════════════════════════════════════════════════

// ── Categorías ───────────────────────────────────────────────────────────────
export type CategoriaCodigo =
  | 'smartphones'
  | 'computadoras'
  | 'gaming'
  | 'wearables'
  | 'tablets'
  | 'audio'
  | 'accesorios'
  | 'repuestos'
  | 'otros'

export interface Categoria {
  codigo: CategoriaCodigo
  label: string
  emoji: string
}

export const CATEGORIAS: Categoria[] = [
  { codigo: 'smartphones',  label: 'Smartphones',  emoji: '📱' },
  { codigo: 'computadoras', label: 'Computadoras', emoji: '💻' },
  { codigo: 'gaming',       label: 'Gaming',       emoji: '🎮' },
  { codigo: 'wearables',    label: 'Wearables',    emoji: '⌚' },
  { codigo: 'tablets',      label: 'Tablets',      emoji: '🖥' },
  { codigo: 'audio',        label: 'Audio',        emoji: '🔊' },
  { codigo: 'accesorios',   label: 'Accesorios',   emoji: '🔌' },
  { codigo: 'repuestos',    label: 'Repuestos',    emoji: '🔧' },
  { codigo: 'otros',        label: 'Otros',        emoji: '📦' },
]

// ── Condición del producto ────────────────────────────────────────────────────
export type Condicion = 'nuevo' | 'usado' | 'reacondicionado'

// ── Campos extra para smartphones usados ─────────────────────────────────────
export interface CamposSmartphone {
  bateria?: number          // % batería
  tieneCaja?: boolean
  tieneAccesorios?: boolean
  fuéReparado?: boolean
  cambióPantalla?: boolean
  cambióBateria?: boolean
  detalles?: string         // observaciones libres
}

// ── Producto unificado ────────────────────────────────────────────────────────
export interface Producto2 {
  id: string
  workspaceId: string
  // Clasificación
  categoria: CategoriaCodigo
  marca: string
  modelo: string
  // Identificador único de unidad
  imei?: string             // smartphones
  serie?: string            // Mac, iPad, consolas
  // Variante
  color?: string
  storage?: string
  // Precios
  precioUSD: number
  moneda: 'USD' | 'ARS'
  // Stock
  stock: number
  condicion: Condicion
  // Campos extra (smartphone usado)
  smartphone?: CamposSmartphone
  // Repuesto
  compatibleCon?: string
  // Meta
  activo: boolean
  creadoPor: string
  createdAt: Date
  updatedAt: Date
}

// ── Movimiento de stock ───────────────────────────────────────────────────────
export type MovimientoTipo = 'entrada' | 'salida' | 'venta' | 'ajuste'

export interface MovimientoStock {
  id: string
  workspaceId: string
  productoId: string
  productoNombre: string    // snapshot del nombre al momento del movimiento
  tipo: MovimientoTipo
  cantidad: number
  precioUnitario?: number
  moneda?: 'USD' | 'ARS'
  ventaId?: string          // si fue por una venta
  otId?: string             // si fue por una OT
  nota?: string
  realizadoPor: string      // uid del usuario
  createdAt: Date
}

// ════════════════════════════════════════════════════════════════════════════
// SISTEMA DE VENTAS
// ════════════════════════════════════════════════════════════════════════════

export type VentaEstado2 = 'pendiente' | 'cerrada' | 'cancelada'
export type FormaPago2 = 'efectivo_usd' | 'efectivo_ars' | 'transferencia' | 'usdt' | 'tarjeta' | 'permuta' | 'otro'

export interface VentaItem2 {
  productoId: string
  productoNombre: string    // snapshot
  cantidad: number
  precioUnitario: number
  moneda: 'USD' | 'ARS'
  fueraDeStock: boolean     // true si se vendió sin stock registrado
}

export interface Venta2 {
  id: string
  codigo: string            // ej: "VTA-20250411-001"
  workspaceId: string
  clienteId?: string
  clienteNombre: string
  items: VentaItem2[]
  total: number
  moneda: 'USD' | 'ARS'
  formaPago: FormaPago2
  estado: VentaEstado2
  notas?: string
  realizadoPor: string
  createdAt: Date
  updatedAt: Date
}

// ════════════════════════════════════════════════════════════════════════════
// SERVICIO TÉCNICO
// ════════════════════════════════════════════════════════════════════════════

export type OTEstado =
  | 'ingreso'
  | 'diagnostico'
  | 'presupuestado'
  | 'aprobado'
  | 'en_reparacion'
  | 'en_laboratorio'   // enviado a laboratorio tercero
  | 'listo'
  | 'entregado'
  | 'cancelado'

export interface OTRepuesto {
  productoId: string
  productoNombre: string
  cantidad: number
  precioUnitario: number
}

export interface OrdenTrabajo {
  id: string
  codigo: string            // ej: "OT-20250411-001"
  workspaceId: string
  // Turno
  turno: string             // ej: "T-001"
  // Cliente y equipo
  clienteId?: string
  clienteNombre: string
  clienteTelefono?: string
  equipoMarca: string
  equipoModelo: string
  equipoImei?: string
  equipoColor?: string
  // Diagnóstico
  problemaReportado: string
  diagnostico?: string
  // Económico
  presupuesto?: number
  moneda: 'USD' | 'ARS'
  repuestosUsados: OTRepuesto[]
  // Asignación
  tecnicoId?: string
  tecnicoNombre?: string
  // Laboratorio tercero
  laboratorio?: string      // nombre del laboratorio
  laboratorioFechaEnvio?: Date
  laboratorioFechaEstimada?: Date
  laboratorioNotas?: string
  // Estado actual
  estado: OTEstado
  estadoHistorial: { estado: OTEstado; fecha: Date; nota?: string }[]
  // Fechas
  fechaEstimada?: Date
  createdAt: Date
  updatedAt: Date
  realizadoPor: string
}

// ── Turno ─────────────────────────────────────────────────────────────────────
export interface Turno {
  id: string
  codigo: string
  workspaceId: string
  clienteNombre?: string
  clienteTelefono?: string
  motivo?: string
  otId?: string
  atendido: boolean
  esAgendado: boolean       // false = walk-in, true = tiene hora reservada
  fechaHora?: Date          // fecha y hora del turno agendado
  notas?: string
  createdAt: Date
}

// ════════════════════════════════════════════════════════════════════════════
// CAJA
// ════════════════════════════════════════════════════════════════════════════

export type MovCajaTipo =
  | 'venta'        // ingreso por venta
  | 'seña'         // ingreso parcial / anticipo
  | 'cobro_ot'     // cobro de orden de trabajo
  | 'gasto'        // egreso / gasto operativo
  | 'retiro'       // retiro del dueño
  | 'ingreso'      // ingreso manual (caja inicial, etc.)
  | 'ajuste'       // corrección

export type MonedaCaja = 'USD' | 'ARS'

export interface MovimientoCaja {
  id: string
  workspaceId: string
  tipo: MovCajaTipo
  descripcion: string
  monto: number
  moneda: MonedaCaja
  esIngreso: boolean       // true = entra plata, false = sale plata
  ventaId?: string
  otId?: string
  creadoPor: string
  createdAt: Date
}

export interface CajaDia {
  id: string
  workspaceId: string
  fecha: string            // YYYY-MM-DD
  abierta: boolean
  saldoInicialUSD: number
  saldoInicialARS: number
  saldoCierreUSD?: number
  saldoCierreARS?: number
  notasCierre?: string
  abiertaPor: string
  cerradaPor?: string
  creadaAt: Date
  cerradaAt?: Date
}

// ════════════════════════════════════════════════════════════════════════════
// SISTEMA DE LICENCIAS Y TEMPLATES
// ════════════════════════════════════════════════════════════════════════════

export interface Template {
  id: string
  slug: string              // 'verisure-arg', 'iphone-club', etc.
  nombre: string
  descripcion: string
  emoji: string
  color: string
  autor: string             // uid del creador (Clozr = 'clozr-official')
  precio?: number           // futuro — por ahora manual
  activo: boolean
  config: WorkspaceConfig   // config que se aplica al workspace
  dataSemilla?: Record<string, any>  // datos iniciales (precios, etc.)
  creadoAt: Date
}

export type LicenciaEstado = 'disponible' | 'activada' | 'revocada' | 'vencida'

export interface Licencia {
  id: string
  codigo: string            // 'VRS-A3F9-X2024'
  templateId: string
  templateSlug: string
  estado: LicenciaEstado
  // Si está activada
  activadaPor?: string      // uid del usuario
  activadaEl?: Date
  activadaNombre?: string   // nombre para mostrar en panel
  // Control
  creadaPor: string         // uid admin
  creadaEl: Date
  revocarEl?: Date          // para vencimientos futuros
  notas?: string
}
