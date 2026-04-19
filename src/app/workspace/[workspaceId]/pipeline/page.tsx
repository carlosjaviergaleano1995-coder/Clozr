'use client'

import { useState, useMemo, useTransition } from 'react'
import { useParams } from 'next/navigation'
import { Plus, ChevronRight, MessageCircle, Bell } from 'lucide-react'
import { useAuthStore, useWorkspaceStore } from '@/store'
import { useCustomers } from '@/hooks/useCustomers'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { fmtARS } from '@/lib/format'

// ── Nueva arquitectura: hook + actions
import { usePipeline } from '@/hooks/usePipeline'
import { addActivity, updateStage, closePipelineItem, createPipelineItem } from '@/features/pipeline/actions'
import { useSystemConfig } from '@/hooks/useSystemConfig'

// ── Tipos compatibles con ambas estructuras
// El hook usePipeline devuelve PipelineItem (nueva arch)
// Los datos existentes son PipelineCliente (vieja arch) — en la misma colección 'pipeline'
// Leemos los campos que están en AMBOS: id, clienteId, customerSnapshot/clienteNombre, status/estado, activities/notas, updatedAt
import type { PipelineItem } from '@/features/pipeline/types'
import { getCustomerName, getKitInteres, getLastActivity } from '@/features/pipeline/adapters'

// ── Tipos de UI (constantes de estados) ──────────────────────────────────────

// Estados por defecto — se sobreescriben con los del sistema si hay uno activo
const ESTADOS_DEFAULT = [
  { id: 'prospecto',       label: 'Prospecto',       emoji: '👤', color: 'var(--text-tertiary)', bg: 'var(--surface-2)'      },
  { id: 'contactado',      label: 'Contactado',      emoji: '📞', color: 'var(--blue)',          bg: 'var(--blue-bg)'        },
  { id: 'visita_agendada', label: 'Visita agendada', emoji: '📅', color: '#a855f7',              bg: 'rgba(168,85,247,0.12)' },
  { id: 'presupuestado',   label: 'Presupuestado',   emoji: '📋', color: 'var(--amber)',         bg: 'var(--amber-bg)'       },
  { id: 'aprobado',        label: 'Aprobado',        emoji: '✅', color: 'var(--green)',         bg: 'var(--green-bg)'       },
  { id: 'instalado',       label: 'Instalado',       emoji: '🛡️', color: 'var(--green)',         bg: 'var(--green-bg)'       },
  { id: 'cobrado',         label: 'Cobrado',         emoji: '💰', color: 'var(--green)',         bg: 'var(--green-bg)'       },
  { id: 'perdido',         label: 'Perdido',         emoji: '❌', color: 'var(--text-tertiary)', bg: 'var(--surface-2)'      },
]

const KITS = ['Catálogo', 'Alto', 'Medio', 'Bajo', 'Catálogo +', 'Alto +', 'Medio/Bajo +']
const ESTADOS_ACTIVOS = ['prospecto','contactado','visita_agendada','presupuestado','aprobado','instalado']







export default function PipelinePage() {
  const params      = useParams()
  const workspaceId = params.workspaceId as string
  const { user }    = useAuthStore()
  const { workspaces } = useWorkspaceStore()
  const ws          = workspaces.find(w => w.id === workspaceId)

  // ── Sistema config — para etapas dinámicas
  const { getPipelineStages, hasSystem } = useSystemConfig()
  const systemStages = getPipelineStages()

  // Construir ESTADOS desde el sistema activo o usar defaults
  const ESTADOS = useMemo(() => {
    if (hasSystem && systemStages.length > 0) {
      const colorMap: Record<string, string> = {
        neutral: 'var(--text-tertiary)', blue: 'var(--blue)', amber: 'var(--amber)',
        green: 'var(--green)', red: 'var(--brand-light)', purple: '#a855f7',
      }
      const bgMap: Record<string, string> = {
        neutral: 'var(--surface-2)', blue: 'var(--blue-bg)', amber: 'var(--amber-bg)',
        green: 'var(--green-bg)', red: 'var(--red-bg)', purple: 'rgba(168,85,247,0.12)',
      }
      return systemStages.map(s => ({
        id: s.id, label: s.nombre, emoji: s.isWon ? '✅' : s.isLost ? '❌' : '📋',
        color: colorMap[s.color] ?? 'var(--text-secondary)',
        bg:    bgMap[s.color]   ?? 'var(--surface-2)',
      }))
    }
    return ESTADOS_DEFAULT
  }, [hasSystem, systemStages])

  const getEstado = (id: string) => ESTADOS.find(e => e.id === id) ?? ESTADOS[0]

  // ── Datos — nueva arquitectura ──────────────────────────────────────────
  const { items: rawItems, loading } = usePipeline(workspaceId)
  const pipelineItems = rawItems as any[]
  const { customers } = useCustomers(workspaceId)

  const [isPending, startTransition] = useTransition()
  const [filtro,    setFiltro]  = useState<string>('todos')
  const [detalle,   setDetalle] = useState<any | null>(null)
  const [showNota,  setShowNota]  = useState(false)
  const [showNuevo, setShowNuevo] = useState(false)

  // Form nota
  const [nTexto,       setNTexto]       = useState('')
  const [nResultado,   setNResultado]   = useState<'positivo'|'neutro'|'negativo'>('neutro')
  const [nProximoPaso, setNProximoPaso] = useState('')

  // Form nuevo item
  const [pClienteId,  setPClienteId]  = useState('')
  const [pKitInteres, setPKitInteres] = useState('')

  // ── Alertas de inactividad ──────────────────────────────────────────────
  const ahora = new Date()
  const alertas = useMemo(() =>
    pipelineItems
      .filter(p => ESTADOS_ACTIVOS.includes(p.stageId))
      .map(p => {
        const dias = Math.floor((ahora.getTime() - p.updatedAt.getTime()) / 86400000)
        return { ...p, diasSinActividad: Math.max(p.inactiveDays ?? 0, dias) }
      })
      .filter(p => p.diasSinActividad >= 7)
      .sort((a, b) => b.diasSinActividad - a.diasSinActividad),
    [pipelineItems]
  )

  const conteos = useMemo(() => {
    const m: Record<string, number> = {}
    pipelineItems.forEach(p => {
      const e = p.stageId
      m[e] = (m[e] ?? 0) + 1
    })
    return m
  }, [pipelineItems])

  const filtered = useMemo(() =>
    filtro === 'todos'
      ? pipelineItems
      : pipelineItems.filter(p => p.stageId === filtro),
    [pipelineItems, filtro]
  )

  // ── Clientes sin pipeline ───────────────────────────────────────────────
  const clientesSinPipeline = customers.filter(c =>
    !pipelineItems.some(p => p.customerId === c.id)
  )

  // ── Acciones ────────────────────────────────────────────────────────────

  const cambiarEstado = (item: any, nuevoEstadoId: string) => {
    const nuevoEstado = ESTADOS.find(e => e.id === nuevoEstadoId)
    if (!nuevoEstado) return

    startTransition(async () => {
      // Si el item es de la nueva arquitectura tiene stageId
      if (item.stageId !== undefined) {
        await updateStage(workspaceId, item.id, {
          stageId:    nuevoEstado.id,
          stageName:  nuevoEstado.label,
          stageOrder: ESTADOS.findIndex(e => e.id === nuevoEstadoId),
        })
      } else {
        // Item viejo — usar service viejo temporalmente
        const { updatePipeline } = await import('@/lib/services')
        await updatePipeline(workspaceId, item.id, { estado: nuevoEstadoId as any })
      }
      if (detalle?.id === item.id) {
        setDetalle((d: any) => d ? { ...d, stageId: nuevoEstadoId, estado: nuevoEstadoId } : d)
      }
    })
  }

  const guardarNota = () => {
    if (!nTexto.trim() || !detalle) return
    startTransition(async () => {
      if (detalle.stageId !== undefined) {
        // Nueva arquitectura
        await addActivity(workspaceId, detalle.id, {
          type:        'note',
          description: nTexto,
          result:      nProximoPaso || undefined,
          performedAt: new Date(),
        })
      } else {
        // Vieja arquitectura
        const { updatePipeline } = await import('@/lib/services')
        const nota = { fecha: new Date(), texto: nTexto, resultado: nResultado, proximoPaso: nProximoPaso || undefined }
        const notas = [...(detalle.notas ?? []), nota]
        await updatePipeline(workspaceId, detalle.id, { notas })
        setDetalle((d: any) => d ? { ...d, notas } : d)
      }
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

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="space-y-3 mt-2">
      {[1,2,3].map(i => <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: 'var(--surface-2)' }} />)}
    </div>
  )

  const activos = pipelineItems.filter(p => ESTADOS_ACTIVOS.includes(p.stageId))

  return (
    <div className="space-y-4 animate-fade-in pb-4">

      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Pipeline</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {activos.length} activos · {pipelineItems.length} total
          </p>
        </div>
        <button onClick={() => setShowNuevo(true)} className="btn-primary gap-1 text-sm">
          <Plus size={15} /> Agregar
        </button>
      </div>

      {/* Alertas */}
      {alertas.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--amber)', background: 'var(--amber-bg)' }}>
          <div className="flex items-center gap-2 px-3 py-2.5" style={{ borderBottom: '1px solid rgba(255,214,10,0.2)' }}>
            <Bell size={13} style={{ color: 'var(--amber)', flexShrink: 0 }} />
            <p className="text-xs font-semibold" style={{ color: 'var(--amber)' }}>
              {alertas.length} {alertas.length === 1 ? 'cliente sin seguimiento' : 'clientes sin seguimiento'}
            </p>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(255,214,10,0.15)' }}>
            {alertas.slice(0, 5).map(p => {
              const esCritico = p.diasSinActividad >= 14
              return (
                <button key={p.id} onClick={() => setDetalle(p)}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-left">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {getCustomerName(p)}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                      {getEstado(p.stageId).emoji} {getEstado(p.stageId).label}
                    </p>
                  </div>
                  <span className="text-xs font-bold px-2 py-1 rounded-lg flex-shrink-0 ml-2"
                    style={{
                      background: esCritico ? 'var(--red-bg)' : 'var(--amber-bg)',
                      color:      esCritico ? 'var(--brand-light)' : 'var(--amber)',
                      border:     `1px solid ${esCritico ? 'var(--brand-light)' : 'var(--amber)'}`,
                    }}>
                    {p.diasSinActividad}d
                  </span>
                </button>
              )
            })}
            {alertas.length > 5 && (
              <p className="text-[10px] text-center py-2" style={{ color: 'var(--text-tertiary)' }}>
                +{alertas.length - 5} más
              </p>
            )}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4">
        <button onClick={() => setFiltro('todos')}
          className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap"
          style={filtro === 'todos'
            ? { background: 'var(--brand)', color: '#fff' }
            : { background: 'var(--surface-2)', color: 'var(--text-tertiary)', border: '1px solid var(--border)' }}>
          Todos ({pipelineItems.length})
        </button>
        {ESTADOS.map(e => {
          const count = conteos[e.id] ?? 0
          if (count === 0 && filtro !== e.id) return null
          return (
            <button key={e.id} onClick={() => setFiltro(e.id)}
              className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap"
              style={filtro === e.id
                ? { background: 'var(--brand)', color: '#fff' }
                : { background: 'var(--surface-2)', color: 'var(--text-tertiary)', border: '1px solid var(--border)' }}>
              {e.emoji} {e.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Sin clientes en este estado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => {
            const estadoId = item.stageId
            const estado   = getEstado(estadoId)
            const notas    = item.activities
            const ultimaNota = notas.length > 0 ? notas[notas.length - 1] : null
            const clienteId = item.customerId
            const cliente = customers.find(c => c.id === clienteId)
            const esActivo = ESTADOS_ACTIVOS.includes(estadoId)
            const dias = esActivo
              ? Math.max(
                  item.inactiveDays ?? 0,
                  Math.floor((ahora.getTime() - item.updatedAt.getTime()) / 86400000)
                )
              : 0
            const tieneAlerta = esActivo && dias >= 7

            // Texto de la última actividad
            const ultimoTexto = ultimaNota
              ? (ultimaNota.description ?? ultimaNota.texto ?? '')
              : ''
            const ultimaFecha = ultimaNota
              ? (ultimaNota.performedAt instanceof Date ? ultimaNota.performedAt : ultimaNota.fecha instanceof Date ? ultimaNota.fecha : null)
              : null

            return (
              <button key={item.id} onClick={() => setDetalle(item)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left"
                style={{
                  background: 'var(--surface)',
                  border: `1px solid ${tieneAlerta ? (dias >= 14 ? 'var(--brand-light)' : 'var(--amber)') : ['aprobado','instalado'].includes(estadoId) ? 'var(--green)' : 'var(--border)'}`,
                }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                  style={{ background: estado.bg }}>
                  {estado.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {getCustomerName(item)}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                      style={{ background: estado.bg, color: estado.color }}>
                      {estado.label}
                    </span>
                    {(item.systemData?.kitInteres ?? item.kitInteres) && (
                      <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                        {item.systemData?.kitInteres ?? item.kitInteres}
                      </span>
                    )}
                  </div>
                  {ultimoTexto ? (
                    <p className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--text-tertiary)' }}>
                      {ultimaFecha ? format(ultimaFecha, 'd MMM', { locale: es }) + ' · ' : ''}{ultimoTexto}
                    </p>
                  ) : (
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Sin actividad</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {tieneAlerta && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-lg"
                      style={{
                        background: dias >= 14 ? 'var(--red-bg)' : 'var(--amber-bg)',
                        color:      dias >= 14 ? 'var(--brand-light)' : 'var(--amber)',
                      }}>
                      {dias}d
                    </span>
                  )}
                  {(cliente?.telefono ?? item.customerSnapshot?.telefono) && (
                    <a href={`https://wa.me/54${(cliente?.telefono ?? item.customerSnapshot?.telefono ?? '').replace(/\D/g,'')}`}
                      target="_blank" onClick={e => e.stopPropagation()}
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: 'var(--green-bg)', color: 'var(--green)' }}>
                      <MessageCircle size={13} />
                    </a>
                  )}
                  <ChevronRight size={14} style={{ color: 'var(--text-tertiary)' }} />
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* ── Detalle ──────────────────────────────────────────────────────── */}
      {detalle && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setDetalle(null)}>
          <div className="w-full max-w-md rounded-2xl animate-slide-up max-h-[92vh] overflow-y-auto"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>

            <div className="px-5 pt-5 pb-3">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                    {getCustomerName(detalle)}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                      style={{ background: getEstado(detalle.stageId).bg, color: getEstado(detalle.stageId).color }}>
                      {getEstado(detalle.stageId).emoji} {getEstado(detalle.stageId).label}
                    </span>
                    {(detalle.systemData?.kitInteres ?? detalle.kitInteres) && (
                      <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                        Kit: {detalle.systemData?.kitInteres ?? detalle.kitInteres}
                      </span>
                    )}
                    {detalle.presupuesto && (
                      <span className="text-[10px] font-semibold" style={{ color: 'var(--green)' }}>
                        {fmtARS(detalle.presupuesto)}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => setDetalle(null)} className="btn-icon">✕</button>
              </div>

              {/* Grid de estados */}
              <div className="grid grid-cols-4 gap-1">
                {ESTADOS.map(e => (
                  <button key={e.id} onClick={() => cambiarEstado(detalle, e.id)}
                    disabled={isPending}
                    className="flex flex-col items-center py-1.5 rounded-xl text-center transition-all"
                    style={detalle.stageId === e.id
                      ? { background: e.bg, border: `1.5px solid ${e.color}` }
                      : { background: 'var(--surface-2)', border: '1.5px solid transparent' }}>
                    <span className="text-sm">{e.emoji}</span>
                    <span className="text-[8px] mt-0.5 font-medium leading-tight"
                      style={{ color: detalle.stageId === e.id ? e.color : 'var(--text-tertiary)' }}>
                      {e.label.split(' ')[0]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border)' }} />

            {/* Historial */}
            <div className="px-5 py-3">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
                  Historial de visitas
                </p>
                <button onClick={() => setShowNota(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold"
                  style={{ background: 'var(--brand)', color: '#fff' }}>
                  <Plus size={12} /> Agregar nota
                </button>
              </div>

              {detalle.activities.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Sin notas todavía</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Registrá cada visita, llamada o contacto</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {[...detalle.activities].reverse().map((nota: any, i: number) => {
                    // Compatibilidad: PipelineActivity (nueva) o NotaVisita (vieja)
                    const texto      = nota.description ?? nota.texto ?? ''
                    const resultado  = nota.result ?? nota.resultado ?? 'neutro'
                    const proximoPaso = nota.result ?? nota.proximoPaso ?? ''
                    const fecha = nota.performedAt instanceof Date ? nota.performedAt
                      : nota.fecha instanceof Date ? nota.fecha
                      : typeof nota.performedAt?.toDate === 'function' ? nota.performedAt.toDate()
                      : typeof nota.fecha?.toDate === 'function' ? nota.fecha.toDate()
                      : new Date()
                    const colorRes = resultado === 'positivo' ? 'var(--green)' : resultado === 'negativo' ? 'var(--brand-light)' : 'var(--amber)'
                    const bgRes    = resultado === 'positivo' ? 'var(--green-bg)' : resultado === 'negativo' ? 'var(--red-bg)' : 'var(--amber-bg)'
                    return (
                      <div key={i} className="px-3 py-3 rounded-xl"
                        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-[10px] font-semibold" style={{ color: 'var(--text-tertiary)' }}>
                            {format(fecha, "d 'de' MMMM · HH:mm", { locale: es })}
                          </p>
                          {resultado !== 'neutro' && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold capitalize"
                              style={{ background: bgRes, color: colorRes }}>
                              {resultado}
                            </span>
                          )}
                        </div>
                        <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{texto}</p>
                        {proximoPaso && (
                          <p className="text-[11px] mt-1.5 font-medium" style={{ color: 'var(--amber)' }}>
                            → Próximo paso: {proximoPaso}
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

      {/* ── Modal nota ────────────────────────────────────────────────────── */}
      {showNota && detalle && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowNota(false)}>
          <div className="w-full max-w-md rounded-2xl p-5 animate-slide-up"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Nueva nota</h3>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{getCustomerName(detalle)}</p>
              </div>
              <button onClick={() => setShowNota(false)} className="btn-icon">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label">¿Qué pasó?</label>
                <textarea className="input text-sm resize-none" rows={3}
                  placeholder="Describí el contacto, visita o llamada..."
                  value={nTexto} onChange={e => setNTexto(e.target.value)} autoFocus />
              </div>
              <div>
                <label className="label">Resultado</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['positivo','neutro','negativo'] as const).map(r => (
                    <button key={r} onClick={() => setNResultado(r)}
                      className="py-2 rounded-xl text-xs font-semibold transition-all"
                      style={nResultado === r
                        ? { background: 'var(--brand)', color: '#fff' }
                        : { background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
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
            <div className="flex gap-2 mt-4">
              <button onClick={guardarNota} disabled={!nTexto.trim() || isPending} className="btn-primary flex-1">
                {isPending ? 'Guardando...' : 'Guardar nota'}
              </button>
              <button onClick={() => setShowNota(false)} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal nuevo item ───────────────────────────────────────────────── */}
      {showNuevo && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowNuevo(false)}>
          <div className="w-full max-w-md rounded-2xl p-5 animate-slide-up"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Agregar al pipeline</h3>
              <button onClick={() => setShowNuevo(false)} className="btn-icon">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label">Cliente *</label>
                {clientesSinPipeline.length > 0 ? (
                  <select className="input text-sm" value={pClienteId}
                    onChange={e => setPClienteId(e.target.value)}>
                    <option value="">Seleccioná un cliente...</option>
                    {clientesSinPipeline.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs py-2" style={{ color: 'var(--text-tertiary)' }}>
                    Todos tus clientes ya están en el pipeline.
                  </p>
                )}
              </div>
              {ws?.config?.moduloVerisure && (
                <div>
                  <label className="label">Kit de interés</label>
                  <div className="flex flex-wrap gap-1.5">
                    {KITS.map(k => (
                      <button key={k} onClick={() => setPKitInteres(pKitInteres === k ? '' : k)}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all"
                        style={pKitInteres === k
                          ? { background: 'var(--brand)', color: '#fff' }
                          : { background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                        {k}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-4">
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
