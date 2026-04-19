'use client'

import { useState, useMemo, useTransition } from 'react'
import { useParams } from 'next/navigation'
import { Plus, MessageCircle, Clock, ChevronRight, Bell } from 'lucide-react'
import { useAuthStore, useWorkspaceStore } from '@/store'
import { useCustomers } from '@/hooks/useCustomers'
import { format, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { fmtARS } from '@/lib/format'

import { usePipeline } from '@/hooks/usePipeline'
import { addActivity, updateStage, createPipelineItem } from '@/features/pipeline/actions'
import { useSystemConfig } from '@/hooks/useSystemConfig'
import type { PipelineItem } from '@/features/pipeline/types'
import { getCustomerName, getKitInteres, getLastActivity } from '@/features/pipeline/adapters'

// ── UI constants ──────────────────────────────────────────────────────────────

const ESTADOS_DEFAULT = [
  { id: 'prospecto',       label: 'Prospecto',       color: 'var(--text-tertiary)', bg: 'rgba(255,255,255,0.06)' },
  { id: 'contactado',      label: 'Contactado',      color: 'var(--blue)',          bg: 'var(--blue-bg)'         },
  { id: 'visita_agendada', label: 'Visita agendada', color: '#a855f7',              bg: 'rgba(168,85,247,0.12)'  },
  { id: 'presupuestado',   label: 'Presupuestado',   color: 'var(--amber)',         bg: 'var(--amber-bg)'        },
  { id: 'aprobado',        label: 'Aprobado',        color: 'var(--green)',         bg: 'var(--green-bg)'        },
  { id: 'instalado',       label: 'Instalado',       color: 'var(--green)',         bg: 'var(--green-bg)'        },
  { id: 'cobrado',         label: 'Cobrado',         color: 'var(--green)',         bg: 'var(--green-bg)'        },
  { id: 'perdido',         label: 'Perdido',         color: 'var(--text-tertiary)', bg: 'rgba(255,255,255,0.04)' },
]
const KITS           = ['Catálogo', 'Alto', 'Medio', 'Bajo', 'Catálogo +', 'Alto +', 'Medio/Bajo +']
const ESTADOS_ACTIVOS = ['prospecto','contactado','visita_agendada','presupuestado','aprobado','instalado']

// ── Helper: initials ──────────────────────────────────────────────────────────
function initials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
}

// ── Helper: inactivity days ───────────────────────────────────────────────────
function diasInactivo(item: any): number {
  return Math.max(
    item.inactiveDays ?? 0,
    Math.floor((Date.now() - (item.updatedAt?.getTime?.() ?? 0)) / 86400000),
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="space-y-4 pt-1 animate-pulse pb-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="h-6 w-28 rounded-lg" style={{ background: 'var(--surface-2)' }} />
          <div className="h-3.5 w-20 rounded" style={{ background: 'var(--surface-2)' }} />
        </div>
        <div className="h-9 w-24 rounded-xl" style={{ background: 'var(--surface-2)' }} />
      </div>
      <div className="flex gap-2 overflow-hidden">
        {[80,100,90].map((w,i) => (
          <div key={i} className="h-4 rounded-full flex-shrink-0" style={{ background: 'var(--surface-2)', width: `${w}px` }} />
        ))}
      </div>
      <div className="space-y-2">
        {[1,2,3,4].map(i => (
          <div key={i} className="h-20 rounded-2xl" style={{ background: 'var(--surface-2)' }} />
        ))}
      </div>
    </div>
  )
}

// ── Pipeline card ─────────────────────────────────────────────────────────────
function PipelineCard({
  item, estado, dias, telefono, onClick,
}: {
  item: any; estado: any; dias: number; telefono?: string; onClick: () => void
}) {
  const name     = getCustomerName(item)
  const kit      = getKitInteres(item)
  const lastAct  = getLastActivity(item)
  const critical = dias >= 14
  const warning  = dias >= 7 && dias < 14
  const hasAlert = dias >= 7

  const borderColor = critical ? 'rgba(232,0,29,0.5)'
                    : warning  ? 'rgba(255,214,10,0.4)'
                    : 'var(--border)'

  const lastActText = lastAct?.description ?? (lastAct as any)?.texto ?? ''
  const lastActDate = lastAct?.performedAt instanceof Date ? lastAct.performedAt
                    : (lastAct as any)?.fecha instanceof Date ? (lastAct as any).fecha
                    : null

  return (
    <button
      onClick={onClick}
      className="w-full text-left press"
      style={{
        background:   'var(--surface)',
        border:       `1px solid ${borderColor}`,
        borderRadius: '16px',
        padding:      '12px 14px',
        display:      'flex',
        flexDirection: 'column',
        gap:          '10px',
      }}
    >
      {/* Row 1: avatar + name + days badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Avatar */}
        <div style={{
          width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
          background: estado.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '12px', fontWeight: 700, color: estado.color,
          border: `1px solid ${borderColor}`,
        }}>
          {initials(name)}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            {name}
          </p>
          {kit && (
            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
              {kit}
            </p>
          )}
        </div>

        {/* Days badge */}
        {hasAlert && (
          <span style={{
            fontSize: '11px', fontWeight: 700, padding: '3px 7px',
            borderRadius: '20px', flexShrink: 0,
            background: critical ? 'var(--red-bg)' : 'var(--amber-bg)',
            color:      critical ? 'var(--brand-light)' : 'var(--amber)',
          }}>
            {dias}d
          </span>
        )}
      </div>

      {/* Row 2: last activity + whatsapp */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {lastActText ? (
            <p style={{
              fontSize: '11.5px', color: 'var(--text-tertiary)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3,
            }}>
              {lastActDate
                ? formatDistanceToNow(lastActDate, { locale: es, addSuffix: true }) + ' · '
                : ''
              }{lastActText}
            </p>
          ) : (
            <p style={{ fontSize: '11.5px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={11} style={{ flexShrink: 0 }} /> Sin actividad
            </p>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {telefono && (
            <a
              href={`https://wa.me/54${telefono.replace(/\D/g, '')}`}
              target="_blank"
              onClick={e => e.stopPropagation()}
              style={{
                width: '28px', height: '28px', borderRadius: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--green-bg)', color: 'var(--green)',
              }}
            >
              <MessageCircle size={13} />
            </a>
          )}
          <ChevronRight size={14} style={{ color: 'var(--text-tertiary)' }} />
        </div>
      </div>
    </button>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PipelinePage() {
  const params      = useParams()
  const workspaceId = params.workspaceId as string
  const { user }    = useAuthStore()
  const { workspaces } = useWorkspaceStore()
  const ws          = workspaces.find(w => w.id === workspaceId)

  const { getPipelineStages, hasSystem } = useSystemConfig()
  const systemStages = getPipelineStages()

  const ESTADOS = useMemo(() => {
    if (hasSystem && systemStages.length > 0) {
      const colorMap: Record<string, string> = {
        neutral: 'var(--text-tertiary)', blue: 'var(--blue)', amber: 'var(--amber)',
        green: 'var(--green)', red: 'var(--brand-light)', purple: '#a855f7',
      }
      const bgMap: Record<string, string> = {
        neutral: 'rgba(255,255,255,0.06)', blue: 'var(--blue-bg)', amber: 'var(--amber-bg)',
        green: 'var(--green-bg)', red: 'var(--red-bg)', purple: 'rgba(168,85,247,0.12)',
      }
      return systemStages.map(s => ({
        id: s.id, label: s.nombre,
        color: colorMap[s.color] ?? 'var(--text-secondary)',
        bg:    bgMap[s.color]   ?? 'rgba(255,255,255,0.06)',
      }))
    }
    return ESTADOS_DEFAULT
  }, [hasSystem, systemStages])

  const getEstado = (id: string) => ESTADOS.find(e => e.id === id) ?? ESTADOS[0]

  const { items: rawItems, loading } = usePipeline(workspaceId)
  const pipelineItems = rawItems as any[]
  const { customers } = useCustomers(workspaceId)

  const [isPending, startTransition] = useTransition()
  const [filtro,    setFiltro]   = useState<string>('todos')
  const [detalle,   setDetalle]  = useState<any | null>(null)
  const [showNota,  setShowNota] = useState(false)
  const [showNuevo, setShowNuevo] = useState(false)

  const [nTexto,       setNTexto]       = useState('')
  const [nResultado,   setNResultado]   = useState<'positivo'|'neutro'|'negativo'>('neutro')
  const [nProximoPaso, setNProximoPaso] = useState('')
  const [pClienteId,  setPClienteId]   = useState('')
  const [pKitInteres, setPKitInteres]  = useState('')

  const ahora = new Date()

  // ── Derived data ──────────────────────────────────────────────────────────
  const activos = useMemo(() =>
    pipelineItems.filter(p => ESTADOS_ACTIVOS.includes(p.stageId)), [pipelineItems])

  const alertas = useMemo(() =>
    pipelineItems
      .filter(p => ESTADOS_ACTIVOS.includes(p.stageId))
      .map(p => ({ ...p, diasSinActividad: diasInactivo(p) }))
      .filter(p => p.diasSinActividad >= 7)
      .sort((a, b) => b.diasSinActividad - a.diasSinActividad),
    [pipelineItems])

  const conteos = useMemo(() => {
    const m: Record<string, number> = {}
    pipelineItems.forEach(p => { m[p.stageId] = (m[p.stageId] ?? 0) + 1 })
    return m
  }, [pipelineItems])

  const filtered = useMemo(() =>
    filtro === 'todos' ? pipelineItems : pipelineItems.filter(p => p.stageId === filtro),
    [pipelineItems, filtro])

  const clientesSinPipeline = customers.filter(c =>
    !pipelineItems.some(p => p.customerId === c.id))

  // ── Summary metrics ───────────────────────────────────────────────────────
  const wonTotal = pipelineItems
    .filter(p => p.status === 'won')
    .reduce((sum: number, p: any) => sum + (p.estimatedValue ?? p.presupuesto ?? 0), 0)

  // ── Actions ───────────────────────────────────────────────────────────────
  const cambiarEstado = (item: any, nuevoEstadoId: string) => {
    const nuevoEstado = ESTADOS.find(e => e.id === nuevoEstadoId)
    if (!nuevoEstado) return
    startTransition(async () => {
      await updateStage(workspaceId, item.id, {
        stageId:    nuevoEstado.id,
        stageName:  nuevoEstado.label,
        stageOrder: ESTADOS.findIndex(e => e.id === nuevoEstadoId),
      })
      if (detalle?.id === item.id) {
        setDetalle((d: any) => d ? { ...d, stageId: nuevoEstadoId } : d)
      }
    })
  }

  const guardarNota = () => {
    if (!nTexto.trim() || !detalle) return
    startTransition(async () => {
      await addActivity(workspaceId, detalle.id, {
        type: 'note', description: nTexto,
        result: nProximoPaso || undefined, performedAt: new Date(),
      })
      setShowNota(false)
      setNTexto(''); setNResultado('neutro'); setNProximoPaso('')
    })
  }

  const crearItem = () => {
    if (!pClienteId) return
    const cliente = customers.find(c => c.id === pClienteId)
    if (!cliente) return
    const primerEstado = ESTADOS[0]
    startTransition(async () => {
      await createPipelineItem(workspaceId, {
        customerId:       pClienteId,
        customerSnapshot: { nombre: cliente.nombre, telefono: cliente.telefono },
        stageId:          primerEstado.id,
        stageName:        primerEstado.label,
        stageOrder:       0,
        currency:         'ARS',
        systemData:       pKitInteres ? { kitInteres: pKitInteres } : undefined,
      })
      setShowNuevo(false)
      setPClienteId(''); setPKitInteres('')
    })
  }

  if (loading) return <Skeleton />

  return (
    <div className="animate-fade-in pb-6" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── 1. HEADER ────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingTop: '4px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.4px' }}>
            Pipeline
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
            {activos.length} activos · {pipelineItems.length} total
            {alertas.length > 0 && (
              <span style={{ color: 'var(--amber)', marginLeft: '6px', fontWeight: 600 }}>
                · {alertas.length} vencidos
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => setShowNuevo(true)}
          className="btn-primary press"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '8px 13px', borderRadius: '12px' }}
        >
          <Plus size={13} /> Agregar
        </button>
      </div>

      {/* ── 2. SUMMARY METRICS ───────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '2px', marginLeft: '-16px', marginRight: '-16px', paddingLeft: '16px', paddingRight: '16px' }}>
        {[
          { label: 'Activos',  value: activos.length,      color: 'var(--text-primary)' },
          { label: 'Vencidos', value: alertas.length,       color: alertas.length > 0 ? 'var(--amber)' : 'var(--text-primary)' },
          { label: 'Cerrados', value: pipelineItems.filter(p => p.status === 'won').length, color: 'var(--green)' },
          ...(wonTotal > 0 ? [{ label: 'Ganado', value: fmtARS(wonTotal), color: 'var(--green)' }] : []),
        ].map(m => (
          <div key={m.label}
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: '14px', padding: '12px 16px', flexShrink: 0, minWidth: '80px',
            }}>
            <p style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
              {m.label}
            </p>
            <p style={{ fontSize: '22px', fontWeight: 800, color: m.color, lineHeight: 1, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.5px' }}>
              {m.value}
            </p>
          </div>
        ))}
      </div>

      {/* ── 3. STAGE FILTER TABS ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px', marginLeft: '-16px', marginRight: '-16px', paddingLeft: '16px', paddingRight: '16px' }}>
        {[{ id: 'todos', label: `Todos`, count: pipelineItems.length }, ...ESTADOS.map(e => ({ id: e.id, label: e.label, count: conteos[e.id] ?? 0 }))].map(tab => {
          if (tab.id !== 'todos' && tab.count === 0 && filtro !== tab.id) return null
          const isActive = filtro === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setFiltro(tab.id)}
              style={{
                flexShrink: 0, padding: '6px 12px', borderRadius: '20px',
                fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap',
                background: isActive ? 'var(--brand)' : 'var(--surface)',
                color:      isActive ? '#fff' : 'var(--text-secondary)',
                border:     isActive ? 'none' : '1px solid var(--border)',
                transition: 'all 0.15s',
              }}
            >
              {tab.label} {tab.count > 0 && !isActive && <span style={{ opacity: 0.6 }}>({tab.count})</span>}
            </button>
          )
        })}
      </div>

      {/* ── 4. CARDS ─────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <p style={{ fontSize: '32px', marginBottom: '12px' }}>📋</p>
          <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Sin leads en esta etapa</p>
          <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
            {filtro === 'todos' ? 'Agregá tu primer lead al pipeline' : 'Cambiá el filtro o agregá uno nuevo'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map(item => {
            const estadoId = item.stageId
            const estado   = getEstado(estadoId)
            const esActivo = ESTADOS_ACTIVOS.includes(estadoId)
            const dias     = esActivo ? diasInactivo(item) : 0
            const cliente  = customers.find(c => c.id === item.customerId)
            const telefono = cliente?.telefono ?? item.customerSnapshot?.telefono

            return (
              <PipelineCard
                key={item.id}
                item={item}
                estado={estado}
                dias={dias}
                telefono={telefono}
                onClick={() => setDetalle(item)}
              />
            )
          })}
        </div>
      )}

      {/* ── DETALLE SHEET ────────────────────────────────────────────────── */}
      {detalle && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', padding: '16px' }}
          onClick={() => setDetalle(null)}
        >
          <div
            className="w-full max-w-md animate-slide-up"
            style={{
              background: 'var(--surface)', border: '1px solid var(--border-strong)',
              borderRadius: '24px', maxHeight: '90vh', overflowY: 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Sheet handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
              <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'var(--border-strong)' }} />
            </div>

            {/* Header */}
            <div style={{ padding: '12px 20px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '50%',
                    background: getEstado(detalle.stageId).bg,
                    border:     `1px solid ${getEstado(detalle.stageId).color}40`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '14px', fontWeight: 700, color: getEstado(detalle.stageId).color,
                  }}>
                    {initials(getCustomerName(detalle))}
                  </div>
                  <div>
                    <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                      {getCustomerName(detalle)}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '20px',
                        background: getEstado(detalle.stageId).bg,
                        color:      getEstado(detalle.stageId).color,
                      }}>
                        {getEstado(detalle.stageId).label}
                      </span>
                      {getKitInteres(detalle) && (
                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                          {getKitInteres(detalle)}
                        </span>
                      )}
                      {(detalle.estimatedValue ?? detalle.presupuesto) > 0 && (
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--green)' }}>
                          {fmtARS(detalle.estimatedValue ?? detalle.presupuesto)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button onClick={() => setDetalle(null)} className="btn-icon" style={{ marginTop: '2px' }}>✕</button>
              </div>

              {/* Stage selector */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                {ESTADOS.map(e => {
                  const isActive = detalle.stageId === e.id
                  return (
                    <button
                      key={e.id}
                      onClick={() => cambiarEstado(detalle, e.id)}
                      disabled={isPending}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        padding: '8px 4px', borderRadius: '10px', gap: '3px',
                        background: isActive ? e.bg : 'var(--surface-2)',
                        border:     isActive ? `1.5px solid ${e.color}` : '1.5px solid transparent',
                        transition: 'all 0.15s',
                      }}
                    >
                      <span style={{ fontSize: '11px', fontWeight: 700, color: isActive ? e.color : 'var(--text-tertiary)', textAlign: 'center', lineHeight: 1.2, wordBreak: 'break-word' }}>
                        {e.label.split(' ')[0]}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ height: '1px', background: 'var(--border)' }} />

            {/* Activity history */}
            <div style={{ padding: '16px 20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-tertiary)' }}>
                  Historial de visitas
                </p>
                <button
                  onClick={() => setShowNota(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    fontSize: '12px', fontWeight: 600, padding: '6px 11px',
                    borderRadius: '10px', background: 'var(--brand)', color: '#fff', border: 'none',
                  }}
                >
                  <Plus size={12} /> Agregar nota
                </button>
              </div>

              {detalle.activities.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Sin actividad registrada</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px', opacity: 0.7 }}>
                    Registrá visitas, llamadas o contactos
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[...detalle.activities].reverse().map((nota: any, i: number) => {
                    const texto       = nota.description ?? nota.texto ?? ''
                    const proximoPaso = nota.result ?? nota.proximoPaso ?? ''
                    const fecha       = nota.performedAt instanceof Date ? nota.performedAt
                                      : nota.fecha instanceof Date ? nota.fecha
                                      : typeof nota.performedAt?.toDate === 'function' ? nota.performedAt.toDate()
                                      : typeof nota.fecha?.toDate === 'function' ? nota.fecha.toDate()
                                      : new Date()
                    return (
                      <div key={i} style={{
                        background: 'var(--surface-2)', border: '1px solid var(--border)',
                        borderRadius: '12px', padding: '12px 14px',
                      }}>
                        <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '6px' }}>
                          {format(fecha, "d 'de' MMMM · HH:mm", { locale: es })}
                        </p>
                        <p style={{ fontSize: '13.5px', color: 'var(--text-primary)', lineHeight: 1.4 }}>{texto}</p>
                        {proximoPaso && (
                          <p style={{ fontSize: '12px', color: 'var(--amber)', marginTop: '6px', fontWeight: 500 }}>
                            → {proximoPaso}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── NOTA MODAL ───────────────────────────────────────────────────── */}
      {showNota && detalle && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', padding: '16px' }}
          onClick={() => setShowNota(false)}
        >
          <div
            className="w-full max-w-md animate-slide-up"
            style={{ background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: '24px', padding: '20px' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Nueva nota</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{getCustomerName(detalle)}</p>
              </div>
              <button onClick={() => setShowNota(false)} className="btn-icon">✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="label">¿Qué pasó?</label>
                <textarea className="input text-sm resize-none" rows={3}
                  placeholder="Describí el contacto, visita o llamada..."
                  value={nTexto} onChange={e => setNTexto(e.target.value)} autoFocus />
              </div>
              <div>
                <label className="label">Resultado</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {(['positivo','neutro','negativo'] as const).map(r => (
                    <button key={r} onClick={() => setNResultado(r)}
                      style={{
                        padding: '8px', borderRadius: '10px', fontSize: '12px', fontWeight: 600,
                        background: nResultado === r ? 'var(--brand)' : 'var(--surface-2)',
                        color:      nResultado === r ? '#fff' : 'var(--text-secondary)',
                        border:     nResultado === r ? 'none' : '1px solid var(--border)',
                      }}>
                      {r === 'positivo' ? '👍 Positivo' : r === 'neutro' ? '😐 Neutro' : '👎 Negativo'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Próximo paso</label>
                <input className="input text-sm" placeholder="Ej: Llamar el martes..."
                  value={nProximoPaso} onChange={e => setNProximoPaso(e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button onClick={guardarNota} disabled={!nTexto.trim() || isPending} className="btn-primary flex-1">
                {isPending ? 'Guardando...' : 'Guardar nota'}
              </button>
              <button onClick={() => setShowNota(false)} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── NUEVO ITEM MODAL ─────────────────────────────────────────────── */}
      {showNuevo && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', padding: '16px' }}
          onClick={() => setShowNuevo(false)}
        >
          <div
            className="w-full max-w-md animate-slide-up"
            style={{ background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: '24px', padding: '20px' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Agregar al pipeline</h3>
              <button onClick={() => setShowNuevo(false)} className="btn-icon">✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="label">Cliente *</label>
                {clientesSinPipeline.length > 0 ? (
                  <select className="input text-sm" value={pClienteId} onChange={e => setPClienteId(e.target.value)}>
                    <option value="">Seleccioná un cliente...</option>
                    {clientesSinPipeline.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                ) : (
                  <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', padding: '8px 0' }}>
                    Todos tus clientes ya están en el pipeline.
                  </p>
                )}
              </div>
              {(ws?.config as any)?.moduloVerisure && (
                <div>
                  <label className="label">Kit de interés</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {KITS.map(k => (
                      <button key={k} onClick={() => setPKitInteres(pKitInteres === k ? '' : k)}
                        style={{
                          padding: '6px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 500,
                          background: pKitInteres === k ? 'var(--brand)' : 'var(--surface-2)',
                          color:      pKitInteres === k ? '#fff' : 'var(--text-secondary)',
                          border:     pKitInteres === k ? 'none' : '1px solid var(--border)',
                        }}>
                        {k}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button onClick={crearItem} disabled={!pClienteId || isPending} className="btn-primary flex-1">
                {isPending ? 'Creando...' : 'Agregar al pipeline'}
              </button>
              <button onClick={() => setShowNuevo(false)} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
