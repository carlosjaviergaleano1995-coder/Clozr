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
