// ── CUSTOMER ADAPTER ──────────────────────────────────────────────────────────
// Traduce documentos Firestore legacy (colección 'clientes') al modelo canónico.
//
// MODELO CANÓNICO: Customer (features/customers/types.ts)
// COLECCIÓN ACTIVA: workspaces/{wid}/clientes
// DEUDA CONOCIDA: campo 'referido' (string nombre) → debería ser 'referidoPor' (id)
//
// Regla: TODA la UI consume Customer canónico.
// Ningún componente importa ClienteTipo, ClienteEstado ni Cliente de @/types.

import type { Customer, CustomerStatus, CustomerType } from './types'

// Shape del documento Firestore legacy
interface LegacyClienteDoc {
  id?: string
  workspaceId?: string
  nombre?: string
  telefono?: string
  email?: string
  direccion?: string
  tipo?: string                    // ClienteTipo viejo
  estado?: string                  // ClienteEstado viejo (incluye 'dormido')
  notas?: string
  dni?: string
  fechaNacimiento?: string
  barrio?: string
  referido?: string                // nombre string — campo legacy
  referidoPor?: string             // id string — campo nuevo
  ultimoContacto?: any
  totalSales?: number
  customFields?: Record<string, unknown>
  tags?: string[]
  searchTokens?: string[]
  creadoPor?: string
  createdAt?: any
  updatedAt?: any
  [key: string]: unknown
}

// Mapa de estados legacy → canónico
const ESTADO_MAP: Record<string, CustomerStatus> = {
  activo:    'activo',
  potencial: 'potencial',
  dormido:   'dormido',    // conservado en canónico por compat
  inactivo:  'inactivo',
  perdido:   'perdido',
  // Aliases históricos
  'Activo':    'activo',
  'Potencial': 'potencial',
  'Dormido':   'dormido',
  'Perdido':   'perdido',
}

// Mapa de tipos legacy → canónico
const TIPO_MAP: Record<string, CustomerType> = {
  final:      'final',
  revendedor: 'revendedor',
  mayorista:  'mayorista',
  empresa:    'empresa',
  // Aliases Verisure (RP usa 'final', RE usa 'empresa')
  'RP':       'final',
  'RE':       'empresa',
}

function toDate(val: any): Date {
  if (!val) return new Date()
  if (val instanceof Date) return val
  if (typeof val.toDate === 'function') return val.toDate()
  if (typeof val === 'string' || typeof val === 'number') return new Date(val)
  return new Date()
}

// ── adaptClienteDoc ────────────────────────────────────────────────────────────
// Convierte un doc Firestore (legacy o nuevo) al modelo Customer canónico.
// Esta es la ÚNICA función que debe conocer el shape legacy.

export function adaptClienteDoc(docId: string, data: LegacyClienteDoc): Customer {
  return {
    id:         docId,
    workspaceId: data.workspaceId ?? '',
    nombre:     data.nombre ?? '(sin nombre)',
    telefono:   data.telefono,
    email:      data.email,
    tipo:       TIPO_MAP[data.tipo ?? ''] ?? 'final',
    estado:     ESTADO_MAP[data.estado ?? ''] ?? 'potencial',
    barrio:     data.barrio,
    direccion:  data.direccion,
    dni:        data.dni,
    // Compat: 'referido' (viejo, nombre string) se preserva
    // 'referidoPor' (nuevo, id) se preserva si existe
    referido:   data.referido,
    referidoPor: data.referidoPor,
    notas:      data.notas,
    lastInteractionAt: data.ultimoContacto ? toDate(data.ultimoContacto) : undefined,
    totalSales: data.totalSales ?? 0,
    customFields: data.customFields,
    tags:         data.tags ?? [],
    searchTokens: data.searchTokens ?? [],
    creadoPor:  data.creadoPor ?? '',
    createdAt:  toDate(data.createdAt),
    updatedAt:  toDate(data.updatedAt),
  }
}

// ── adaptClienteArray ─────────────────────────────────────────────────────────

export function adaptClienteArray(
  docs: { id: string; data: () => Record<string, unknown> }[],
): Customer[] {
  return docs.map(d => adaptClienteDoc(d.id, d.data() as LegacyClienteDoc))
}

// ── Mapa inverso: Customer canónico → datos para escritura en Firestore ────────
// Solo los campos que existen en ambos formatos — para updates parciales

export function customerToFirestoreUpdate(
  input: Partial<Customer>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (input.nombre    !== undefined) out.nombre    = input.nombre
  if (input.telefono  !== undefined) out.telefono  = input.telefono ?? null
  if (input.email     !== undefined) out.email     = input.email ?? null
  if (input.tipo      !== undefined) out.tipo      = input.tipo
  if (input.estado    !== undefined) out.estado    = input.estado
  if (input.barrio    !== undefined) out.barrio    = input.barrio ?? null
  if (input.direccion !== undefined) out.direccion = input.direccion ?? null
  if (input.dni       !== undefined) out.dni       = input.dni ?? null
  if (input.referido  !== undefined) out.referido  = input.referido ?? null
  if (input.notas     !== undefined) out.notas     = input.notas ?? null
  if (input.customFields !== undefined) out.customFields = input.customFields
  if (input.tags      !== undefined) out.tags      = input.tags ?? []
  return out
}
