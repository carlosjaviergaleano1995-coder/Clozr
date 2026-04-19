// ── PIPELINE ADAPTER ──────────────────────────────────────────────────────────
// Traduce documentos Firestore legacy (PipelineCliente) al modelo canónico.
//
// PROBLEMA: la colección 'pipeline' tiene dos shapes coexistiendo:
//   A) PipelineCliente (legacy): { clienteId, clienteNombre, estado, notas: NotaVisita[], kitInteres }
//   B) PipelineItem (nuevo):     { customerId, customerSnapshot, stageId, activities, systemData }
//
// La función adaptPipelineDoc detecta el shape y normaliza siempre a PipelineItem canónico.
//
// MODELO CANÓNICO: PipelineItem (features/pipeline/types.ts)
// COLECCIÓN ACTIVA: workspaces/{wid}/pipeline

import type { PipelineItem, PipelineActivity, PipelineStatus } from './types'

// ── Detectores de shape ────────────────────────────────────────────────────────

export function isLegacyPipelineDoc(data: Record<string, unknown>): boolean {
  // Doc legacy tiene 'estado' (string) y 'notas' (array de NotaVisita)
  // Doc nuevo tiene 'stageId' (string) y 'activities' (array de PipelineActivity)
  return 'clienteId' in data && 'estado' in data && !('stageId' in data)
}

// ── Mapeo de estados legacy → stageId canónico ─────────────────────────────────

const LEGACY_ESTADO_TO_STAGE: Record<string, { stageId: string; stageName: string; stageOrder: number }> = {
  prospecto:       { stageId: 'prospecto',       stageName: 'Prospecto',       stageOrder: 0 },
  contactado:      { stageId: 'contactado',      stageName: 'Contactado',      stageOrder: 1 },
  visita_agendada: { stageId: 'visita_agendada', stageName: 'Visita agendada', stageOrder: 2 },
  presupuestado:   { stageId: 'presupuestado',   stageName: 'Presupuestado',   stageOrder: 3 },
  aprobado:        { stageId: 'aprobado',        stageName: 'Aprobado',        stageOrder: 4 },
  instalado:       { stageId: 'instalado',       stageName: 'Instalado',       stageOrder: 5 },
  cobrado:         { stageId: 'cobrado',         stageName: 'Cobrado',         stageOrder: 6 },
  perdido:         { stageId: 'perdido',         stageName: 'Perdido',         stageOrder: 7 },
}

const ESTADOS_CERRADOS = ['cobrado', 'perdido', 'instalado']
const ESTADOS_WON      = ['cobrado', 'instalado']
const ESTADOS_LOST     = ['perdido']

function inferStatus(estado: string): PipelineStatus {
  if (ESTADOS_WON.includes(estado)) return 'won'
  if (ESTADOS_LOST.includes(estado)) return 'lost'
  return 'open'
}

function toDate(val: any): Date {
  if (!val) return new Date()
  if (val instanceof Date) return val
  if (typeof val.toDate === 'function') return val.toDate()
  return new Date(val)
}

// Convierte NotaVisita legacy → PipelineActivity canónico
function adaptNotaToActivity(nota: any, index: number): PipelineActivity {
  return {
    id:              `legacy-nota-${index}`,
    type:            'note',
    description:     nota.texto ?? '',
    result:          nota.proximoPaso,
    performedAt:     toDate(nota.fecha),
    performedBy:     'legacy',
    performedByName: 'Importado',
  }
}

// ── adaptPipelineDoc ──────────────────────────────────────────────────────────
// Detecta el shape y retorna siempre un PipelineItem canónico.

export function adaptPipelineDoc(docId: string, data: Record<string, unknown>): PipelineItem {
  if (isLegacyPipelineDoc(data)) {
    return adaptLegacyPipelineCliente(docId, data)
  }
  return adaptNewPipelineItem(docId, data)
}

function adaptLegacyPipelineCliente(docId: string, data: any): PipelineItem {
  const estadoKey = (data.estado ?? 'prospecto') as string
  const stage     = LEGACY_ESTADO_TO_STAGE[estadoKey] ?? LEGACY_ESTADO_TO_STAGE.prospecto
  const notas: any[] = data.notas ?? []
  const activities   = notas.map(adaptNotaToActivity)
  const status       = inferStatus(estadoKey)
  const updatedAt    = toDate(data.updatedAt)

  const inactiveDays = status === 'open'
    ? Math.floor((Date.now() - updatedAt.getTime()) / 86400000)
    : 0

  return {
    id:          docId,
    workspaceId: data.workspaceId ?? '',
    customerId:  data.clienteId   ?? '',
    customerSnapshot: {
      nombre:   data.clienteNombre ?? '(sin nombre)',
      telefono: undefined,
    },
    stageId:    stage.stageId,
    stageName:  stage.stageName,
    stageOrder: stage.stageOrder,
    nextAction:    undefined,
    nextActionAt:  undefined,
    activities,
    estimatedValue: data.presupuesto ?? undefined,
    closedValue:    undefined,
    currency:       'ARS',
    // Preservar datos legacy en systemData para no perderlos
    systemData: {
      _legacyShape: true,
      kitInteres:    data.kitInteres,
      fechaInstalacion: data.fechaInstalacion,
      fechaCobro:       data.fechaCobro,
    },
    status,
    closedAt:     status !== 'open' ? updatedAt : undefined,
    closedReason: undefined,
    lastActivityAt: updatedAt,
    inactiveDays,
    creadoPor:   data.creadoPor ?? '',
    createdAt:   toDate(data.creadoAt ?? data.createdAt),
    updatedAt,
  }
}

function adaptNewPipelineItem(docId: string, data: any): PipelineItem {
  const activities: PipelineActivity[] = (data.activities ?? []).map((a: any) => ({
    ...a,
    performedAt: toDate(a.performedAt),
  }))

  return {
    id:          docId,
    workspaceId: data.workspaceId ?? '',
    customerId:  data.customerId ?? '',
    customerSnapshot: data.customerSnapshot ?? { nombre: '(sin nombre)' },
    stageId:    data.stageId    ?? 'prospecto',
    stageName:  data.stageName  ?? 'Prospecto',
    stageOrder: data.stageOrder ?? 0,
    nextAction:    data.nextAction,
    nextActionAt:  data.nextActionAt ? toDate(data.nextActionAt) : undefined,
    activities,
    estimatedValue: data.estimatedValue,
    closedValue:    data.closedValue,
    currency:       data.currency ?? 'ARS',
    systemData:     data.systemData,
    status:         data.status ?? 'open',
    closedAt:       data.closedAt ? toDate(data.closedAt) : undefined,
    closedReason:   data.closedReason,
    lastActivityAt: toDate(data.lastActivityAt ?? data.updatedAt),
    inactiveDays:   data.inactiveDays ?? 0,
    creadoPor:      data.creadoPor ?? '',
    createdAt:      toDate(data.createdAt),
    updatedAt:      toDate(data.updatedAt),
  }
}

// ── Helpers de presentación ────────────────────────────────────────────────────
// Usado por la UI para extraer datos sin importar el shape original

export function getCustomerName(item: PipelineItem): string {
  return item.customerSnapshot.nombre
}

export function getKitInteres(item: PipelineItem): string | undefined {
  return item.systemData?.kitInteres as string | undefined
}

export function getLastActivity(item: PipelineItem): PipelineActivity | undefined {
  return item.activities.at(-1)
}
