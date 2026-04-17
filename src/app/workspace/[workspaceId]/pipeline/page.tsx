'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { Plus, ChevronRight, MessageCircle, Check, Clock, X, Bell } from 'lucide-react'
import { getPipeline, createPipeline, updatePipeline, getClientes } from '@/lib/services'
import { useAuthStore } from '@/store'
import type { PipelineCliente, EstadoPipeline, NotaVisita, Cliente } from '@/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toDate } from '@/lib/services'
import { fmtARS } from '@/lib/format'

const ESTADOS: { id: EstadoPipeline; label: string; emoji: string; color: string; bg: string }[] = [
  { id: 'prospecto',       label: 'Prospecto',        emoji: '👤', color: 'var(--text-tertiary)', bg: 'var(--surface-2)'        },
  { id: 'contactado',      label: 'Contactado',       emoji: '📞', color: 'var(--blue)',          bg: 'var(--blue-bg)'          },
  { id: 'visita_agendada', label: 'Visita agendada',  emoji: '📅', color: '#a855f7',              bg: 'rgba(168,85,247,0.12)'   },
  { id: 'presupuestado',   label: 'Presupuestado',    emoji: '📋', color: 'var(--amber)',         bg: 'var(--amber-bg)'         },
  { id: 'aprobado',        label: 'Aprobado',         emoji: '✅', color: 'var(--green)',         bg: 'var(--green-bg)'         },
  { id: 'instalado',       label: 'Instalado',        emoji: '🛡️', color: 'var(--green)',         bg: 'var(--green-bg)'         },
  { id: 'cobrado',         label: 'Cobrado',          emoji: '💰', color: 'var(--green)',         bg: 'var(--green-bg)'         },
  { id: 'perdido',         label: 'Perdido',          emoji: '❌', color: 'var(--text-tertiary)', bg: 'var(--surface-2)'        },
]

const KITS = ['Catálogo', 'Alto', 'Medio', 'Bajo', 'Catálogo +', 'Alto +', 'Medio/Bajo +']

const getEstado = (id: EstadoPipeline) => ESTADOS.find(e => e.id === id) ?? ESTADOS[0]

export default function PipelinePage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const { user } = useAuthStore()

  const [pipeline, setPipeline] = useState<PipelineCliente[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<EstadoPipeline | 'todos'>('todos')
  const [detalle, setDetalle] = useState<PipelineCliente | null>(null)
  const [showNota, setShowNota] = useState(false)
  const [showNuevo, setShowNuevo] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form nueva nota
  const [nTexto, setNTexto] = useState('')
  const [nResultado, setNResultado] = useState<'positivo' | 'neutro' | 'negativo'>('neutro')
  const [nProximoPaso, setNProximoPaso] = useState('')

  // Form nuevo pipeline
  const [pClienteId, setPClienteId] = useState('')
  const [pKitInteres, setPKitInteres] = useState('')
  const [pPresupuesto, setPPresupuesto] = useState(0)

  useEffect(() => { load() }, [workspaceId])

  const load = async () => {
    try {
      const [p, c] = await Promise.all([getPipeline(workspaceId), getClientes(workspaceId)])
      setPipeline(p)
      setClientes(c)
    } finally { setLoading(false) }
  }

  const filtered = useMemo(() =>
    pipeline.filter(p => filtro === 'todos' || p.estado === filtro),
    [pipeline, filtro]
  )

  // Alertas de seguimiento
  const ESTADOS_ACTIVOS: EstadoPipeline[] = ['prospecto','contactado','visita_agendada','presupuestado','aprobado','instalado']
  const ahora = new Date()
  const alertas = useMemo(() =>
    pipeline
      .filter(p => ESTADOS_ACTIVOS.includes(p.estado))
      .map(p => {
        const ultima = toDate(p.updatedAt)
        const diasSinActividad = Math.floor((ahora.getTime() - ultima.getTime()) / (1000 * 60 * 60 * 24))
        return { ...p, diasSinActividad }
      })
      .filter(p => p.diasSinActividad >= 7)
      .sort((a, b) => b.diasSinActividad - a.diasSinActividad),
    [pipeline]
  )

  // Conteo por estado para el kanban header
  const conteos = useMemo(() => {
    const m: Record<string, number> = {}
    pipeline.forEach(p => { m[p.estado] = (m[p.estado] ?? 0) + 1 })
    return m
  }, [pipeline])

  const cambiarEstado = async (p: PipelineCliente, estado: EstadoPipeline) => {
    await updatePipeline(workspaceId, p.id, { estado })
    setPipeline(prev => prev.map(x => x.id === p.id ? { ...x, estado } : x))
    if (detalle?.id === p.id) setDetalle(d => d ? { ...d, estado } : d)
  }

  const agregarNota = async () => {
    if (!nTexto.trim() || !detalle || !user) return
    setSaving(true)
    try {
      const nota: NotaVisita = {
        fecha: new Date(),
        texto: nTexto,
        resultado: nResultado,
        proximoPaso: nProximoPaso || undefined,
      }
      const notasActualizadas = [...(detalle.notas ?? []), nota]
      await updatePipeline(workspaceId, detalle.id, { notas: notasActualizadas })
      const updated = { ...detalle, notas: notasActualizadas }
      setPipeline(prev => prev.map(p => p.id === detalle.id ? updated : p))
      setDetalle(updated)
      setShowNota(false)
      setNTexto(''); setNResultado('neutro'); setNProximoPaso('')
    } finally { setSaving(false) }
  }

  const crearPipeline = async () => {
    if (!pClienteId || !user) return
    setSaving(true)
    try {
      const cliente = clientes.find(c => c.id === pClienteId)
      if (!cliente) return
      const id = await createPipeline(workspaceId, {
        workspaceId,
        clienteId: pClienteId,
        clienteNombre: cliente.nombre,
        estado: 'prospecto',
        kitInteres: pKitInteres || undefined,
        presupuesto: pPresupuesto || undefined,
        notas: [],
      })
      const nuevo: PipelineCliente = {
        id, workspaceId, clienteId: pClienteId, clienteNombre: cliente.nombre,
        estado: 'prospecto', kitInteres: pKitInteres || undefined,
        presupuesto: pPresupuesto || undefined, notas: [],
        creadoAt: new Date(), updatedAt: new Date(),
      }
      setPipeline(prev => [nuevo, ...prev])
      setShowNuevo(false)
      setPClienteId(''); setPKitInteres(''); setPPresupuesto(0)
    } finally { setSaving(false) }
  }

  // Clientes que no tienen pipeline aún
  const clientesSinPipeline = clientes.filter(c =>
    !pipeline.some(p => p.clienteId === c.id)
  )

  if (loading) return (
    <div className="space-y-3 mt-2">
      {[1,2,3].map(i => <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: 'var(--surface-2)' }} />)}
    </div>
  )

  return (
    <div className="space-y-4 animate-fade-in pb-4">

      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Pipeline</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {pipeline.filter(p => !['cobrado','perdido'].includes(p.estado)).length} activos ·{' '}
            {pipeline.filter(p => p.estado === 'instalado').length} instalados ·{' '}
            {pipeline.filter(p => p.estado === 'cobrado').length} cobrados
          </p>
        </div>
        <button onClick={() => setShowNuevo(true)} className="btn-primary gap-1 text-sm">
          <Plus size={15} /> Agregar
        </button>
      </div>

      {/* Alertas de seguimiento */}
      {alertas.length > 0 && (
        <div className="rounded-2xl overflow-hidden"
          style={{ border: '1px solid var(--amber)', background: 'var(--amber-bg)' }}>
          <div className="flex items-center gap-2 px-3 py-2.5"
            style={{ borderBottom: alertas.length > 0 ? '1px solid rgba(255,214,10,0.2)' : 'none' }}>
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
                  className="w-full flex items-center justify-between px-3 py-2.5 text-left transition-all"
                  style={{ background: 'transparent' }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {p.clienteNombre}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                      {getEstado(p.estado).emoji} {getEstado(p.estado).label}
                      {p.kitInteres && ` · ${p.kitInteres}`}
                    </p>
                  </div>
                  <span className="text-xs font-bold px-2 py-1 rounded-lg flex-shrink-0 ml-2"
                    style={{
                      background: esCritico ? 'var(--red-bg)' : 'var(--amber-bg)',
                      color: esCritico ? 'var(--brand-light)' : 'var(--amber)',
                      border: `1px solid ${esCritico ? 'var(--brand-light)' : 'var(--amber)'}`,
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

      {/* Filtro por estado */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4">
        <button onClick={() => setFiltro('todos')}
          className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all"
          style={filtro === 'todos'
            ? { background: 'var(--brand)', color: '#fff' }
            : { background: 'var(--surface-2)', color: 'var(--text-tertiary)', border: '1px solid var(--border)' }}>
          Todos ({pipeline.length})
        </button>
        {ESTADOS.map(e => {
          const count = conteos[e.id] ?? 0
          if (count === 0 && filtro !== e.id) return null
          return (
            <button key={e.id} onClick={() => setFiltro(e.id)}
              className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all"
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
          {filtered.map(p => {
            const estado = getEstado(p.estado)
            const ultimaNota = p.notas?.length > 0 ? p.notas[p.notas.length - 1] : null
            const cliente = clientes.find(c => c.id === p.clienteId)
            const esActivo = ESTADOS_ACTIVOS.includes(p.estado)
            const diasSin = esActivo
              ? Math.floor((ahora.getTime() - toDate(p.updatedAt).getTime()) / (1000 * 60 * 60 * 24))
              : 0
            const tieneAlerta = esActivo && diasSin >= 7
            return (
              <button key={p.id} onClick={() => setDetalle(p)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all"
                style={{ background: 'var(--surface)', border: `1px solid ${tieneAlerta ? (diasSin >= 14 ? 'var(--brand-light)' : 'var(--amber)') : p.estado === 'aprobado' || p.estado === 'instalado' ? 'var(--green)' : 'var(--border)'}` }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                  style={{ background: estado.bg }}>
                  {estado.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{p.clienteNombre}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                      style={{ background: estado.bg, color: estado.color }}>
                      {estado.label}
                    </span>
                    {p.kitInteres && (
                      <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{p.kitInteres}</span>
                    )}
                  </div>
                  {ultimaNota ? (
                    <p className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--text-tertiary)' }}>
                      {format(toDate(ultimaNota.fecha), "d MMM")} · {ultimaNota.texto}
                    </p>
                  ) : (
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Sin notas todavía</p>
                  )}
                  {ultimaNota?.proximoPaso && (
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--amber)' }}>
                      → {ultimaNota.proximoPaso}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {tieneAlerta && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-lg"
                      style={{
                        background: diasSin >= 14 ? 'var(--red-bg)' : 'var(--amber-bg)',
                        color: diasSin >= 14 ? 'var(--brand-light)' : 'var(--amber)',
                      }}>
                      {diasSin}d
                    </span>
                  )}
                  {cliente?.telefono && (
                    <a href={`https://wa.me/54${cliente.telefono.replace(/\D/g,'')}`}
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

      {/* ── Detalle / historial ──────────────────────────────────────────── */}
      {detalle && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setDetalle(null)}>
          <div className="w-full max-w-md rounded-2xl animate-slide-up max-h-[92vh] overflow-y-auto"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>

            {/* Header detalle */}
            <div className="px-5 pt-5 pb-3">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>{detalle.clienteNombre}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                      style={{ background: getEstado(detalle.estado).bg, color: getEstado(detalle.estado).color }}>
                      {getEstado(detalle.estado).emoji} {getEstado(detalle.estado).label}
                    </span>
                    {detalle.kitInteres && <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Kit: {detalle.kitInteres}</span>}
                    {detalle.presupuesto && <span className="text-[10px] font-semibold" style={{ color: 'var(--green)' }}>{fmtARS(detalle.presupuesto)}</span>}
                  </div>
                </div>
                <button onClick={() => setDetalle(null)} className="btn-icon">✕</button>
              </div>

              {/* Cambiar estado */}
              <div className="grid grid-cols-4 gap-1">
                {ESTADOS.map(e => (
                  <button key={e.id} onClick={() => cambiarEstado(detalle, e.id)}
                    className="flex flex-col items-center py-1.5 rounded-xl text-center transition-all"
                    style={detalle.estado === e.id
                      ? { background: e.bg, border: `1.5px solid ${e.color}` }
                      : { background: 'var(--surface-2)', border: '1.5px solid transparent' }}>
                    <span className="text-sm">{e.emoji}</span>
                    <span className="text-[8px] mt-0.5 font-medium leading-tight"
                      style={{ color: detalle.estado === e.id ? e.color : 'var(--text-tertiary)' }}>
                      {e.label.split(' ')[0]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border)' }} />

            {/* Historial de notas */}
            <div className="px-5 py-3">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
                  Historial de visitas
                </p>
                <button onClick={() => setShowNota(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all"
                  style={{ background: 'var(--brand)', color: '#fff' }}>
                  <Plus size={12} /> Agregar nota
                </button>
              </div>

              {(!detalle.notas || detalle.notas.length === 0) ? (
                <div className="text-center py-6">
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Sin notas todavía</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                    Registrá cada visita, llamada o contacto
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {[...detalle.notas].reverse().map((nota, i) => {
                    const colorResultado = nota.resultado === 'positivo' ? 'var(--green)' : nota.resultado === 'negativo' ? 'var(--brand-light)' : 'var(--amber)'
                    const bgResultado = nota.resultado === 'positivo' ? 'var(--green-bg)' : nota.resultado === 'negativo' ? 'var(--red-bg)' : 'var(--amber-bg)'
                    return (
                      <div key={i} className="px-3 py-3 rounded-xl"
                        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-[10px] font-semibold" style={{ color: 'var(--text-tertiary)' }}>
                            {format(toDate(nota.fecha), "d 'de' MMMM · HH:mm", { locale: es })}
                          </p>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold capitalize"
                            style={{ background: bgResultado, color: colorResultado }}>
                            {nota.resultado}
                          </span>
                        </div>
                        <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{nota.texto}</p>
                        {nota.proximoPaso && (
                          <p className="text-[11px] mt-1.5 font-medium"
                            style={{ color: 'var(--amber)' }}>
                            → Próximo paso: {nota.proximoPaso}
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

      {/* ── Modal agregar nota ────────────────────────────────────────────── */}
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
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{detalle.clienteNombre}</p>
              </div>
              <button onClick={() => setShowNota(false)} className="btn-icon">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label">¿Cómo fue?</label>
                <textarea className="input text-sm resize-none" rows={3}
                  placeholder="Describí el contacto, visita o llamada..."
                  value={nTexto} onChange={e => setNTexto(e.target.value)} autoFocus />
              </div>
              <div>
                <label className="label">Resultado</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'positivo', label: '👍 Positivo', color: 'var(--green)' },
                    { id: 'neutro',   label: '😐 Neutro',   color: 'var(--amber)' },
                    { id: 'negativo', label: '👎 Negativo',  color: 'var(--brand-light)' },
                  ].map(r => (
                    <button key={r.id} onClick={() => setNResultado(r.id as any)}
                      className="py-2 rounded-xl text-xs font-semibold transition-all"
                      style={nResultado === r.id
                        ? { background: 'var(--brand)', color: '#fff' }
                        : { background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Próximo paso</label>
                <input className="input text-sm"
                  placeholder="Ej: Llamar el martes, enviar presupuesto..."
                  value={nProximoPaso} onChange={e => setNProximoPaso(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={agregarNota} disabled={!nTexto.trim() || saving} className="btn-primary flex-1">
                {saving ? 'Guardando...' : 'Guardar nota'}
              </button>
              <button onClick={() => setShowNota(false)} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal nuevo pipeline ──────────────────────────────────────────── */}
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
                    Todos tus clientes ya están en el pipeline. Agregá nuevos desde Clientes.
                  </p>
                )}
              </div>
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
              <div>
                <label className="label">Presupuesto (ARS)</label>
                <input type="number" className="input text-sm" placeholder="0"
                  value={pPresupuesto || ''} onChange={e => setPPresupuesto(Number(e.target.value))} />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={crearPipeline} disabled={!pClienteId || saving} className="btn-primary flex-1">
                {saving ? 'Creando...' : 'Agregar al pipeline'}
              </button>
              <button onClick={() => setShowNuevo(false)} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
