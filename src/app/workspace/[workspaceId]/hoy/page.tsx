'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Plus, Check, Package, Wrench, MessageCircle, ChevronRight, Clock, Calendar, Bell, ShoppingCart, DollarSign } from 'lucide-react'
import {
  getTurnosHoy, getTurnosFuturos, createTurno, updateTurno,
  generarCodigo, getOrdenesTrabajo, getProductos2,
  getCajaHoy, getMovimientosCaja, getTareas, toggleTarea,
} from '@/lib/services'
import { useAuthStore, useWorkspaceStore } from '@/store'
import type { Turno, OrdenTrabajo, Producto2, Tarea } from '@/types'
import { format, isToday, isTomorrow } from 'date-fns'
import { es } from 'date-fns/locale'
import { toDate } from '@/lib/services'

const MOTIVOS_GENERAL = [
  { id: 'compra',      label: 'Compra equipo',  emoji: '📱', esCompra: true },
  { id: 'plan_canje',  label: 'Plan canje',     emoji: '💱', esCompra: true },
  { id: 'reparacion',  label: 'Reparación',     emoji: '🔧' },
  { id: 'consulta',    label: 'Consulta',       emoji: '🛒' },
  { id: 'presupuesto', label: 'Presupuesto',    emoji: '📋' },
  { id: 'retiro',      label: 'Retiro equipo',  emoji: '👋' },
  { id: 'otro',        label: 'Otro',           emoji: '📌' },
]

const MOTIVOS_VERISURE = [
  { id: 'visita',       label: 'Visita comercial', emoji: '🏠' },
  { id: 'presupuesto',  label: 'Presupuesto',      emoji: '📋' },
  { id: 'instalacion',  label: 'Instalación',      emoji: '🔧' },
  { id: 'seguimiento',  label: 'Seguimiento',      emoji: '🔄' },
  { id: 'cobranza',     label: 'Cobranza',         emoji: '💰' },
  { id: 'otro',         label: 'Otro',             emoji: '📌' },
]


const fmtUSD = (n: number) => `U$S ${n}`

export default function HoyPage() {
  const params = useParams()
  const router = useRouter()
  const workspaceId = params.workspaceId as string
  const { user } = useAuthStore()
  const { workspaces } = useWorkspaceStore()
  const ws = workspaces.find(w => w.id === workspaceId)

  const [turnosHoy, setTurnosHoy] = useState<Turno[]>([])
  const [turnosFuturos, setTurnosFuturos] = useState<Turno[]>([])
  const [ordenes, setOrdenes] = useState<OrdenTrabajo[]>([])
  const [stockCritico, setStockCritico] = useState<Producto2[]>([])
  const [caja, setCaja] = useState<any>(null)
  const [ingresoHoy, setIngresoHoy] = useState(0)
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [loading, setLoading] = useState(true)

  // Modal turno
  const [showTurno, setShowTurno] = useState(false)
  const [tNombre, setTNombre] = useState('')
  const [tTelefono, setTTelefono] = useState('')
  const [tMotivo, setTMotivo] = useState('compra')
  const [tAgendado, setTAgendado] = useState(false)
  const [tFechaHora, setTFechaHora] = useState('')
  const [tNotas, setTNotas] = useState('')
  const [saving, setSaving] = useState(false)
  const [showAccion, setShowAccion] = useState<Turno | null>(null)

  useEffect(() => { load() }, [workspaceId])

  const load = async () => {
    try {
      const hoyStr = new Date().toISOString().slice(0, 10)
      const [th, tf, ots, prods, cajaData, movs, tars] = await Promise.all([
        getTurnosHoy(workspaceId),
        getTurnosFuturos(workspaceId),
        getOrdenesTrabajo(workspaceId),
        getProductos2(workspaceId),
        getCajaHoy(workspaceId),
        getMovimientosCaja(workspaceId, hoyStr),
        getTareas(workspaceId),
      ])
      // Ordenar turnos de hoy: agendados por hora, walk-ins al final
      const ordenados = [...th].sort((a, b) => {
        if (a.esAgendado && b.esAgendado && a.fechaHora && b.fechaHora)
          return toDate(a.fechaHora).getTime() - toDate(b.fechaHora).getTime()
        if (a.esAgendado) return -1
        if (b.esAgendado) return 1
        return toDate(a.createdAt).getTime() - toDate(b.createdAt).getTime()
      })
      setTurnosHoy(ordenados)
      setTurnosFuturos(tf.slice(0, 5))
      setOrdenes(ots)
      setStockCritico(prods.filter(p => p.stock === 0).slice(0, 5))
      setCaja(cajaData)
      setIngresoHoy(movs.filter(m => m.esIngreso && m.moneda === 'USD').reduce((a,m) => a+m.monto, 0))
      setTareas(tars.filter(t => !t.completada && (t.frecuencia === 'diaria' || t.frecuencia === 'unica')))
    } finally { setLoading(false) }
  }

  const isVerisure = ws?.config?.moduloVerisure === true

  const MOTIVOS = isVerisure ? MOTIVOS_VERISURE : MOTIVOS_GENERAL
  const pendientes = turnosHoy.filter(t => !t.atendido)
  const listos = ordenes.filter(o => o.estado === 'listo')
  const enLab = ordenes.filter(o => o.estado === 'en_laboratorio')

  // Acciones rápidas según workspace
  const accionesRapidas = isVerisure ? [
    { label: 'Visita',   icon: Clock,        action: () => setShowTurno(true),                                            color: 'var(--brand)' },
    { label: 'Venta',    icon: ShoppingCart, action: () => router.push(`/workspace/${workspaceId}/ventas-verisure`),      color: 'var(--green)' },
    { label: 'Cliente',  icon: MessageCircle,action: () => router.push(`/workspace/${workspaceId}/clientes`),             color: 'var(--blue)'  },
    { label: 'Resumen',  icon: DollarSign,   action: () => router.push(`/workspace/${workspaceId}/resumen-verisure`),     color: 'var(--amber)' },
  ] : [
    { label: 'Turno',    icon: Clock,        action: () => setShowTurno(true),                                            color: 'var(--brand)' },
    { label: 'Venta',    icon: ShoppingCart, action: () => router.push(`/workspace/${workspaceId}/inventario`),           color: 'var(--green)' },
    { label: 'OT',       icon: Wrench,       action: () => router.push(`/workspace/${workspaceId}/ordenes`),              color: '#a855f7'      },
    { label: 'Caja',     icon: DollarSign,   action: () => router.push(`/workspace/${workspaceId}/caja`),                 color: 'var(--amber)' },
  ]

  const handleCrearTurno = async () => {
    if (!user) return
    setSaving(true)
    try {
      const codigo = await generarCodigo(workspaceId, 'T')
      await createTurno(workspaceId, {
        codigo, workspaceId,
        clienteNombre: tNombre || undefined,
        clienteTelefono: tTelefono || undefined,
        motivo: tMotivo,
        atendido: false,
        esAgendado: tAgendado,
        fechaHora: tAgendado && tFechaHora ? new Date(tFechaHora) : undefined,
        notas: tNotas || undefined,
      })
      await load()
      setShowTurno(false)
      setTNombre(''); setTTelefono(''); setTMotivo('compra')
      setTAgendado(false); setTFechaHora(''); setTNotas('')
    } finally { setSaving(false) }
  }

  const marcarAtendido = async (t: Turno) => {
    await updateTurno(workspaceId, t.id, { atendido: true })
    setTurnosHoy(prev => prev.map(x => x.id === t.id ? { ...x, atendido: true } : x))
    const motivoInfo = MOTIVOS.find(m => m.id === t.motivo)
    if ((motivoInfo as any)?.esCompra) setShowAccion({ ...t, atendido: true })
  }

  const irAStock = (t: Turno) => {
    setShowAccion(null)
    const p = new URLSearchParams({ cliente: t.clienteNombre ?? '', from: 'turno' })
    router.push(`/workspace/${workspaceId}/inventario?${p.toString()}`)
  }

  const saludo = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Buenos días'
    if (h < 19) return 'Buenas tardes'
    return 'Buenas noches'
  }

  if (loading) return (
    <div className="space-y-3 mt-4">
      {[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--surface-2)' }} />)}
    </div>
  )

  return (
    <div className="space-y-4 animate-fade-in pb-6">

      {/* Header */}
      <div className="pt-1">
        <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
          {saludo()} 👋
        </p>
        <p className="text-sm capitalize mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
          {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
        </p>
      </div>

      {/* Acciones rápidas */}
      <div className="grid grid-cols-4 gap-2">
        {accionesRapidas.map(({ label, icon: Icon, action, color }) => (
          <button key={label} onClick={action}
            className="flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all active:scale-95"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: color + '18' }}>
              <Icon size={18} style={{ color }} />
            </div>
            <span className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>{label}</span>
          </button>
        ))}
      </div>

      {/* Alertas activas — solo para workspaces no-Verisure */}
      {!isVerisure && (listos.length > 0 || enLab.length > 0 || stockCritico.length > 0 || !caja) && (
        <div className="space-y-2">
          {!caja && (
            <button onClick={() => router.push(`/workspace/${workspaceId}/caja`)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
              style={{ background: 'var(--amber-bg)', border: '1px solid var(--amber)' }}>
              <Bell size={16} style={{ color: 'var(--amber)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--amber)' }}>Caja sin abrir</span>
              <ChevronRight size={14} className="ml-auto" style={{ color: 'var(--amber)' }} />
            </button>
          )}
          {listos.length > 0 && (
            <button onClick={() => router.push(`/workspace/${workspaceId}/ordenes`)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
              style={{ background: 'var(--green-bg)', border: '1px solid var(--green)' }}>
              <Package size={16} style={{ color: 'var(--green)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--green)' }}>
                {listos.length} equipo{listos.length > 1 ? 's' : ''} listo{listos.length > 1 ? 's' : ''} para entregar
              </span>
              <ChevronRight size={14} className="ml-auto" style={{ color: 'var(--green)' }} />
            </button>
          )}
          {enLab.length > 0 && (
            <button onClick={() => router.push(`/workspace/${workspaceId}/ordenes`)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl"
              style={{ background: 'var(--blue-bg)', border: '1px solid var(--blue)' }}>
              <Wrench size={16} style={{ color: 'var(--blue)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--blue)' }}>
                {enLab.length} en laboratorio
              </span>
              <ChevronRight size={14} className="ml-auto" style={{ color: 'var(--blue)' }} />
            </button>
          )}
          {stockCritico.length > 0 && (
            <button onClick={() => router.push(`/workspace/${workspaceId}/inventario`)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl"
              style={{ background: 'var(--red-bg)', border: '1px solid rgba(232,0,29,0.3)' }}>
              <Package size={16} style={{ color: 'var(--brand-light)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--brand-light)' }}>
                {stockCritico.length} producto{stockCritico.length > 1 ? 's' : ''} sin stock
              </span>
              <ChevronRight size={14} className="ml-auto" style={{ color: 'var(--brand-light)' }} />
            </button>
          )}
        </div>
      )}

      {/* Turnos de hoy */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
            Turnos de hoy
          </p>
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {pendientes.length} pendientes
          </span>
        </div>

        {turnosHoy.length === 0 ? (
          <button onClick={() => setShowTurno(true)}
            className="w-full flex items-center justify-center gap-2 py-6 rounded-2xl transition-all"
            style={{ background: 'var(--surface)', border: '1px dashed var(--border)' }}>
            <Plus size={16} style={{ color: 'var(--text-tertiary)' }} />
            <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Agregar primer turno del día</span>
          </button>
        ) : (
          <div className="space-y-2">
            {turnosHoy.map((t, idx) => {
              const motivoInfo = MOTIVOS.find(m => m.id === t.motivo)
              const hora = t.esAgendado && t.fechaHora
                ? format(toDate(t.fechaHora), "HH:mm")
                : format(toDate(t.createdAt), "HH:mm")

              return (
                <div key={t.id}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl transition-all"
                  style={{
                    background: t.atendido ? 'transparent' : 'var(--surface)',
                    border: `1px solid ${t.atendido ? 'var(--border)' : t.esAgendado ? 'rgba(232,0,29,0.2)' : 'var(--border)'}`,
                    opacity: t.atendido ? 0.5 : 1,
                  }}>
                  {/* Hora */}
                  <div className="w-12 text-center flex-shrink-0">
                    <p className="text-sm font-bold" style={{ color: t.atendido ? 'var(--text-tertiary)' : 'var(--brand)' }}>
                      {hora}
                    </p>
                    {t.esAgendado && (
                      <p className="text-[9px]" style={{ color: 'var(--text-tertiary)' }}>agend.</p>
                    )}
                  </div>

                  <div className="w-px h-8 flex-shrink-0" style={{ background: 'var(--border)' }} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {motivoInfo && <span className="text-sm">{motivoInfo.emoji}</span>}
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {t.clienteNombre || 'Sin nombre'}
                      </span>
                      {motivoInfo && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                          style={{ background: 'var(--surface-2)', color: 'var(--text-tertiary)' }}>
                          {motivoInfo.label}
                        </span>
                      )}
                    </div>
                    {t.clienteTelefono && (
                      <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                        {t.clienteTelefono}
                      </p>
                    )}
                    {t.notas && (
                      <p className="text-[10px] mt-0.5 italic" style={{ color: 'var(--text-tertiary)' }}>
                        {t.notas}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-1.5 flex-shrink-0">
                    {t.clienteTelefono && !t.atendido && (
                      <a href={`https://wa.me/54${t.clienteTelefono.replace(/\D/g,'')}`} target="_blank"
                        className="w-8 h-8 rounded-xl flex items-center justify-center"
                        style={{ background: 'var(--green-bg)', color: 'var(--green)' }}>
                        <MessageCircle size={14} />
                      </a>
                    )}
                    {!t.atendido && (
                      <button onClick={() => marcarAtendido(t)}
                        className="w-8 h-8 rounded-xl flex items-center justify-center"
                        style={{ background: 'var(--green-bg)', color: 'var(--green)' }}>
                        <Check size={16} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}

            <button onClick={() => setShowTurno(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl transition-all"
              style={{ background: 'var(--surface-2)', border: '1px dashed var(--border)' }}>
              <Plus size={14} style={{ color: 'var(--text-tertiary)' }} />
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Agregar turno</span>
            </button>
          </div>
        )}
      </div>

      {/* Próximos turnos (días futuros) */}
      {turnosFuturos.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-tertiary)' }}>
            Próximos
          </p>
          <div className="space-y-1.5">
            {turnosFuturos.map(t => {
              const motivoInfo = MOTIVOS.find(m => m.id === t.motivo)
              const fecha = toDate(t.fechaHora!)
              const fechaLabel = isToday(fecha) ? 'Hoy'
                : isTomorrow(fecha) ? 'Mañana'
                : format(fecha, "EEEE d/M", { locale: es })
              return (
                <div key={t.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <Calendar size={14} style={{ color: 'var(--blue)' }} className="flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {t.clienteNombre || 'Sin nombre'} {motivoInfo && `· ${motivoInfo.emoji} ${motivoInfo.label}`}
                    </p>
                  </div>
                  <span className="text-xs flex-shrink-0 font-semibold capitalize" style={{ color: 'var(--blue)' }}>
                    {fechaLabel} {format(fecha, "HH:mm")}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tareas del día */}
      {tareas.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-tertiary)' }}>
            Tareas pendientes
          </p>
          <div className="space-y-1.5">
            {tareas.slice(0, 4).map(t => (
              <div key={t.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <button onClick={async () => {
                  await toggleTarea(workspaceId, t.id, true)
                  setTareas(prev => prev.filter(x => x.id !== t.id))
                }}
                  className="w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all"
                  style={{ borderColor: 'var(--border-strong)' }} />
                <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{t.titulo}</span>
                <span className="text-[10px] ml-auto flex-shrink-0"
                  style={{ color: t.frecuencia === 'diaria' ? 'var(--brand)' : 'var(--text-tertiary)' }}>
                  {t.frecuencia === 'diaria' ? 'Diaria' : 'Hoy'}
                </span>
              </div>
            ))}
            {tareas.length > 4 && (
              <button onClick={() => router.push(`/workspace/${workspaceId}/tareas`)}
                className="w-full text-center text-xs py-2" style={{ color: 'var(--text-tertiary)' }}>
                +{tareas.length - 4} más → ir a Tareas
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modal nuevo turno */}
      {showTurno && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowTurno(false)}>
          <div className="w-full max-w-md rounded-2xl p-5 animate-slide-up max-h-[92vh] overflow-y-auto"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Nuevo turno</h3>
              <button onClick={() => setShowTurno(false)} className="btn-icon">✕</button>
            </div>

            <div className="space-y-3">
              {/* ¿Ahora o agendado? */}
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setTAgendado(false)}
                  className="py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={!tAgendado
                    ? { background: 'var(--brand)', color: '#fff' }
                    : { background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                  🚶 Ahora
                </button>
                <button onClick={() => setTAgendado(true)}
                  className="py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={tAgendado
                    ? { background: 'var(--brand)', color: '#fff' }
                    : { background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                  📅 Agendar
                </button>
              </div>

              {/* Fecha y hora si es agendado */}
              {tAgendado && (
                <div>
                  <label className="label">Fecha y hora</label>
                  <input type="datetime-local" className="input text-sm"
                    value={tFechaHora} onChange={e => setTFechaHora(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)} />
                </div>
              )}

              {/* Motivo */}
              <div>
                <label className="label">Motivo</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {MOTIVOS.map(m => (
                    <button key={m.id} onClick={() => setTMotivo(m.id)}
                      className="flex items-center gap-2 py-2.5 px-3 rounded-xl text-left transition-all"
                      style={tMotivo === m.id
                        ? { background: 'var(--brand)', border: '1.5px solid var(--brand)' }
                        : { background: 'var(--surface-2)', border: '1.5px solid var(--border)' }}>
                      <span>{m.emoji}</span>
                      <span className="text-xs font-medium"
                        style={{ color: tMotivo === m.id ? '#fff' : 'var(--text-secondary)' }}>
                        {m.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cliente */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Nombre</label>
                  <input className="input text-sm" placeholder="Cliente"
                    value={tNombre} onChange={e => setTNombre(e.target.value)} autoFocus />
                </div>
                <div>
                  <label className="label">Teléfono</label>
                  <input className="input text-sm" placeholder="221..."
                    value={tTelefono} onChange={e => setTTelefono(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="label">Notas</label>
                <input className="input text-sm" placeholder="Ej: busca iPhone 16 negro 128gb"
                  value={tNotas} onChange={e => setTNotas(e.target.value)} />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={handleCrearTurno} disabled={saving} className="btn-primary flex-1">
                {saving ? 'Creando...' : tAgendado ? '📅 Agendar turno' : `🚶 Crear turno · #${pendientes.length + 1}`}
              </button>
              <button onClick={() => setShowTurno(false)} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal post-atención compra */}
      {showAccion && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowAccion(null)}>
          <div className="w-full max-w-md rounded-2xl p-5 animate-slide-up"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--green-bg)' }}>
                <Check size={20} style={{ color: 'var(--green)' }} />
              </div>
              <div>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Turno atendido ✓</p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {showAccion.codigo} · {showAccion.clienteNombre}
                </p>
              </div>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              ¿Compraste el equipo? Cargalo al inventario ahora.
            </p>
            <div className="flex gap-2">
              <button onClick={() => irAStock(showAccion)}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold"
                style={{ background: 'var(--brand)', color: '#fff' }}>
                <Package size={16} /> Cargar al inventario
              </button>
              <button onClick={() => setShowAccion(null)}
                className="px-4 py-3 rounded-xl text-sm font-medium"
                style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                Después
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
