'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { Plus, Search, ChevronRight, Clock, CheckCircle, Wrench, XCircle, Package, User } from 'lucide-react'
import {
  getOrdenesTrabajo, createOrdenTrabajo, updateOrdenTrabajo,
  generarCodigo, getProductos2, getTurnosHoy,
} from '@/lib/services'
import { useAuthStore } from '@/store'
import type { OrdenTrabajo, OTEstado, OTRepuesto, Producto2, Turno } from '@/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toDate } from '@/lib/services'

const ESTADOS: { id: OTEstado; label: string; color: string; bg: string; icon: any }[] = [
  { id: 'ingreso',        label: 'Ingreso',        color: 'var(--text-tertiary)', bg: 'var(--surface-3)',       icon: Package },
  { id: 'diagnostico',    label: 'Diagnóstico',    color: 'var(--blue)',          bg: 'var(--blue-bg)',         icon: Search },
  { id: 'presupuestado',  label: 'Presupuestado',  color: 'var(--amber)',         bg: 'var(--amber-bg)',        icon: Clock },
  { id: 'aprobado',       label: 'Aprobado',       color: 'var(--green)',         bg: 'var(--green-bg)',        icon: CheckCircle },
  { id: 'en_reparacion',  label: 'En reparación',  color: '#a855f7',              bg: 'rgba(168,85,247,0.12)', icon: Wrench },
  { id: 'en_laboratorio', label: 'En laboratorio', color: 'var(--blue)',          bg: 'var(--blue-bg)',         icon: Package },
  { id: 'listo',          label: 'Listo',          color: 'var(--green)',         bg: 'var(--green-bg)',        icon: CheckCircle },
  { id: 'entregado',      label: 'Entregado',      color: 'var(--text-tertiary)', bg: 'var(--surface-3)',       icon: CheckCircle },
  { id: 'cancelado',      label: 'Cancelado',      color: 'var(--brand-light)',   bg: 'var(--red-bg)',          icon: XCircle },
]

const getEstadoInfo = (id: OTEstado) => ESTADOS.find(e => e.id === id) ?? ESTADOS[0]

const MOTIVOS_COMUNES = ['Cambio de pantalla', 'Cambio de batería', 'No enciende', 'Conector carga', 'Cámara', 'Software/Sistema', 'Mojado', 'Otro']

type FormData = {
  clienteNombre: string
  clienteTelefono: string
  equipoMarca: string
  equipoModelo: string
  equipoImei: string
  equipoColor: string
  problemaReportado: string
  tecnicoNombre: string
  presupuesto: string
  moneda: 'USD' | 'ARS'
  turnoId: string
}

const EMPTY: FormData = {
  clienteNombre: '', clienteTelefono: '', equipoMarca: 'Apple', equipoModelo: '',
  equipoImei: '', equipoColor: '', problemaReportado: '', tecnicoNombre: '',
  presupuesto: '', moneda: 'USD', turnoId: '',
}

export default function OrdenesPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const { user } = useAuthStore()

  const [ordenes, setOrdenes] = useState<OrdenTrabajo[]>([])
  const [productos, setProductos] = useState<Producto2[]>([])
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState<OTEstado | 'activos' | 'todos'>('activos')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [detalle, setDetalle] = useState<OrdenTrabajo | null>(null)
  const [form, setForm] = useState<FormData>({ ...EMPTY })
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [workspaceId])

  const load = async () => {
    try {
      const [ots, prods, turs] = await Promise.all([
        getOrdenesTrabajo(workspaceId),
        getProductos2(workspaceId),
        getTurnosHoy(workspaceId),
      ])
      setOrdenes(ots.sort((a, b) => toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime()))
      setProductos(prods)
      setTurnos(turs)
    } finally { setLoading(false) }
  }

  const ESTADOS_ACTIVOS: OTEstado[] = ['ingreso', 'diagnostico', 'presupuestado', 'aprobado', 'en_reparacion', 'listo']

  const filtered = useMemo(() => {
    let list = ordenes
    if (filtroEstado === 'activos') list = list.filter(o => ESTADOS_ACTIVOS.includes(o.estado))
    else if (filtroEstado !== 'todos') list = list.filter(o => o.estado === filtroEstado)
    if (search) list = list.filter(o =>
      `${o.codigo} ${o.clienteNombre} ${o.equipoMarca} ${o.equipoModelo}`.toLowerCase().includes(search.toLowerCase()))
    return list
  }, [ordenes, filtroEstado, search])

  const handleCreate = async () => {
    if (!form.clienteNombre || !form.equipoModelo || !form.problemaReportado || !user) return
    setSaving(true)
    try {
      const codigo = await generarCodigo(workspaceId, 'OT')
      const turno = form.turnoId ? `T-${turnos.find(t => t.id === form.turnoId)?.codigo ?? ''}` : ''
      await createOrdenTrabajo(workspaceId, {
        codigo,
        workspaceId,
        turno: turno || codigo,
        clienteNombre: form.clienteNombre,
        clienteTelefono: form.clienteTelefono || undefined,
        equipoMarca: form.equipoMarca,
        equipoModelo: form.equipoModelo,
        equipoImei: form.equipoImei || undefined,
        equipoColor: form.equipoColor || undefined,
        problemaReportado: form.problemaReportado,
        presupuesto: form.presupuesto ? Number(form.presupuesto) : undefined,
        moneda: form.moneda,
        repuestosUsados: [],
        tecnicoNombre: form.tecnicoNombre || undefined,
        estado: 'ingreso',
        estadoHistorial: [{ estado: 'ingreso', fecha: new Date() }],
        realizadoPor: user.uid,
      })
      await load()
      setShowForm(false)
      setForm({ ...EMPTY })
    } finally { setSaving(false) }
  }

  const cambiarEstado = async (ot: OrdenTrabajo, nuevoEstado: OTEstado) => {
    const nuevo = {
      estado: nuevoEstado,
      estadoHistorial: [...(ot.estadoHistorial ?? []), { estado: nuevoEstado, fecha: new Date() }],
    }
    await updateOrdenTrabajo(workspaceId, ot.id, nuevo)
    setOrdenes(prev => prev.map(o => o.id === ot.id ? { ...o, ...nuevo } : o))
    if (detalle?.id === ot.id) setDetalle(o => o ? { ...o, ...nuevo } : o)
  }

  const activos = ordenes.filter(o => ESTADOS_ACTIVOS.includes(o.estado)).length
  const listos = ordenes.filter(o => o.estado === 'listo').length

  if (loading) return (
    <div className="space-y-3 mt-2">
      {[1,2,3].map(i => <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: 'var(--surface-2)' }} />)}
    </div>
  )

  return (
    <div className="space-y-3 animate-fade-in pb-4">

      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Órdenes de Trabajo</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {activos} activas · <span style={{ color: 'var(--green)' }}>{listos} listas para entregar</span>
          </p>
        </div>
        <button onClick={() => { setForm({ ...EMPTY }); setShowForm(true) }} className="btn-primary gap-1 text-sm">
          <Plus size={15} /> Nueva OT
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4">
        {([
          { id: 'activos', label: '🔧 Activas' },
          { id: 'todos',   label: 'Todas' },
          ...ESTADOS.map(e => ({ id: e.id, label: e.label }))
        ] as { id: string; label: string }[]).map(f => (
          <button key={f.id} onClick={() => setFiltroEstado(f.id as any)}
            className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all"
            style={filtroEstado === f.id
              ? { background: 'var(--brand)', color: '#fff' }
              : { background: 'var(--surface-2)', color: 'var(--text-tertiary)', border: '1px solid var(--border)' }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
        <input className="input pl-8 text-sm" placeholder="Buscar por código, cliente, equipo..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="text-center py-10">
          <Wrench size={28} className="mx-auto mb-2" style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Sin órdenes</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(ot => {
            const estado = getEstadoInfo(ot.estado)
            const Icon = estado.icon
            const fecha = toDate(ot.createdAt)
            return (
              <button key={ot.id} onClick={() => setDetalle(ot)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all"
                style={{ background: 'var(--surface)', border: `1px solid ${ot.estado === 'listo' ? 'var(--green)' : 'var(--border)'}` }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: estado.bg }}>
                  <Icon size={16} style={{ color: estado.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-bold" style={{ color: 'var(--brand-light)' }}>{ot.codigo}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                      style={{ background: estado.bg, color: estado.color }}>
                      {estado.label}
                    </span>
                  </div>
                  <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>
                    {ot.equipoMarca} {ot.equipoModelo}
                    {ot.equipoColor && ` · ${ot.equipoColor}`}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {ot.clienteNombre}
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                      · {format(fecha, "d MMM", { locale: es })}
                    </span>
                    {ot.tecnicoNombre && (
                      <span className="text-[10px]" style={{ color: 'var(--blue)' }}>
                        · {ot.tecnicoNombre}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--text-tertiary)' }}>
                    {ot.problemaReportado}
                  </p>
                </div>
                <ChevronRight size={16} style={{ color: 'var(--text-tertiary)' }} className="flex-shrink-0" />
              </button>
            )
          })}
        </div>
      )}

      {/* Detalle OT */}
      {detalle && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setDetalle(null)}>
          <div className="w-full max-w-md rounded-2xl p-5 animate-slide-up max-h-[92vh] overflow-y-auto"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-sm font-mono font-bold" style={{ color: 'var(--brand-light)' }}>{detalle.codigo}</span>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                  {format(toDate(detalle.createdAt), "d 'de' MMMM, HH:mm", { locale: es })}
                </p>
              </div>
              <button onClick={() => setDetalle(null)} className="btn-icon">✕</button>
            </div>

            {/* Equipo y cliente */}
            <div className="rounded-xl p-3 mb-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                {detalle.equipoMarca} {detalle.equipoModelo} {detalle.equipoColor && `· ${detalle.equipoColor}`}
              </p>
              {detalle.equipoImei && <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>IMEI: {detalle.equipoImei}</p>}
              <div className="flex items-center gap-2 mt-2">
                <User size={12} style={{ color: 'var(--text-tertiary)' }} />
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{detalle.clienteNombre}</span>
                {detalle.clienteTelefono && (
                  <a href={`https://wa.me/54${detalle.clienteTelefono.replace(/\D/g,'')}`} target="_blank"
                    className="text-xs px-2 py-0.5 rounded-lg" style={{ background: 'var(--green-bg)', color: 'var(--green)' }}>
                    WA
                  </a>
                )}
              </div>
            </div>

            {/* Problema y diagnóstico */}
            <div className="space-y-2 mb-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-tertiary)' }}>Problema reportado</p>
                <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{detalle.problemaReportado}</p>
              </div>
              {detalle.diagnostico && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-tertiary)' }}>Diagnóstico</p>
                  <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{detalle.diagnostico}</p>
                </div>
              )}
              {detalle.presupuesto && (
                <div className="flex justify-between items-center px-3 py-2 rounded-xl"
                  style={{ background: 'var(--green-bg)', border: '1px solid var(--green)' }}>
                  <span className="text-xs font-semibold" style={{ color: 'var(--green)' }}>Presupuesto</span>
                  <span className="text-sm font-bold" style={{ color: 'var(--green)' }}>
                    {detalle.moneda === 'USD' ? `U$S ${detalle.presupuesto}` : `$${detalle.presupuesto?.toLocaleString('es-AR')}`}
                  </span>
                </div>
              )}
              {detalle.tecnicoNombre && (
                <p className="text-xs" style={{ color: 'var(--blue)' }}>🔧 Técnico: {detalle.tecnicoNombre}</p>
              )}
            </div>

            {/* Cambiar estado */}
            <div className="mb-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-tertiary)' }}>Estado actual</p>
              <div className="grid grid-cols-2 gap-1.5">
                {ESTADOS.map(e => {
                  const Icon = e.icon
                  const isActual = detalle.estado === e.id
                  return (
                    <button key={e.id} onClick={() => cambiarEstado(detalle, e.id)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all"
                      style={isActual
                        ? { background: e.bg, border: `1.5px solid ${e.color}` }
                        : { background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                      <Icon size={13} style={{ color: isActual ? e.color : 'var(--text-tertiary)' }} />
                      <span className="text-xs font-medium"
                        style={{ color: isActual ? e.color : 'var(--text-secondary)' }}>
                        {e.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Historial de estados */}
            {detalle.estadoHistorial?.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-tertiary)' }}>Historial</p>
                <div className="space-y-1">
                  {[...detalle.estadoHistorial].reverse().map((h, i) => {
                    const e = getEstadoInfo(h.estado)
                    return (
                      <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded-lg"
                        style={{ background: 'var(--surface-2)' }}>
                        <span className="text-xs font-medium" style={{ color: e.color }}>{e.label}</span>
                        <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                          {format(toDate(h.fecha), "d MMM HH:mm", { locale: es })}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal nueva OT */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md rounded-2xl p-5 animate-slide-up max-h-[92vh] overflow-y-auto"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Nueva Orden de Trabajo</h3>
              <button onClick={() => setShowForm(false)} className="btn-icon">✕</button>
            </div>

            <div className="space-y-3">

              {/* Cliente */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Cliente *</label>
                  <input className="input text-sm" placeholder="Nombre"
                    value={form.clienteNombre} onChange={e => setForm(f => ({ ...f, clienteNombre: e.target.value }))} autoFocus />
                </div>
                <div>
                  <label className="label">Teléfono</label>
                  <input className="input text-sm" placeholder="221..."
                    value={form.clienteTelefono} onChange={e => setForm(f => ({ ...f, clienteTelefono: e.target.value }))} />
                </div>
              </div>

              {/* Equipo */}
              <div>
                <label className="label">Equipo *</label>
                <div className="flex gap-1.5 mb-1.5 flex-wrap">
                  {['Apple', 'Samsung', 'Motorola', 'Sony', 'Xiaomi'].map(m => (
                    <button key={m} onClick={() => setForm(f => ({ ...f, equipoMarca: m }))}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                      style={form.equipoMarca === m
                        ? { background: 'var(--brand)', color: '#fff' }
                        : { background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                      {m}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input className="input text-sm" placeholder="Marca"
                    value={form.equipoMarca} onChange={e => setForm(f => ({ ...f, equipoMarca: e.target.value }))} />
                  <input className="input text-sm" placeholder="Modelo (ej: iPhone 13)"
                    value={form.equipoModelo} onChange={e => setForm(f => ({ ...f, equipoModelo: e.target.value }))} />
                </div>
              </div>

              {/* Color + IMEI */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Color</label>
                  <input className="input text-sm" placeholder="BLACK"
                    value={form.equipoColor} onChange={e => setForm(f => ({ ...f, equipoColor: e.target.value.toUpperCase() }))} />
                </div>
                <div>
                  <label className="label">IMEI / Serie</label>
                  <input className="input text-sm" placeholder="Opcional"
                    value={form.equipoImei} onChange={e => setForm(f => ({ ...f, equipoImei: e.target.value }))} />
                </div>
              </div>

              {/* Problema */}
              <div>
                <label className="label">Problema reportado *</label>
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  {MOTIVOS_COMUNES.map(m => (
                    <button key={m} onClick={() => setForm(f => ({ ...f, problemaReportado: m }))}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                      style={form.problemaReportado === m
                        ? { background: 'var(--brand)', color: '#fff' }
                        : { background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                      {m}
                    </button>
                  ))}
                </div>
                <textarea className="input text-sm resize-none" rows={2}
                  placeholder="Descripción del problema..."
                  value={form.problemaReportado} onChange={e => setForm(f => ({ ...f, problemaReportado: e.target.value }))} />
              </div>

              {/* Presupuesto + Técnico */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Presupuesto</label>
                  <div className="flex gap-1">
                    <input type="number" className="input text-sm flex-1" placeholder="0"
                      value={form.presupuesto} onChange={e => setForm(f => ({ ...f, presupuesto: e.target.value }))} />
                    <div className="flex gap-1">
                      {(['USD', 'ARS'] as const).map(m => (
                        <button key={m} onClick={() => setForm(f => ({ ...f, moneda: m }))}
                          className="px-1.5 py-1 rounded-lg text-[10px] font-bold transition-all"
                          style={form.moneda === m
                            ? { background: 'var(--brand)', color: '#fff' }
                            : { background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="label">Técnico</label>
                  <input className="input text-sm" placeholder="Nombre técnico"
                    value={form.tecnicoNombre} onChange={e => setForm(f => ({ ...f, tecnicoNombre: e.target.value }))} />
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={handleCreate}
                disabled={!form.clienteNombre || !form.equipoModelo || !form.problemaReportado || saving}
                className="btn-primary flex-1">
                {saving ? 'Creando...' : 'Crear OT'}
              </button>
              <button onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
