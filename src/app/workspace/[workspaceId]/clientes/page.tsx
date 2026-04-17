'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { Plus, Search, MessageCircle, Pencil, Trash2, ChevronRight, X, Phone, DollarSign, MapPin, Navigation } from 'lucide-react'
import {
  getClientes, createCliente, updateCliente, deleteCliente,
  getVentas2, agregarMovimientoCaja, getPlantillas,
  getPipelineByCliente, createPipeline, updatePipeline, agregarNotaVisita,
} from '@/lib/services'
import { useMemberRole } from '@/hooks/useMemberRole'
import { useAuthStore, useWorkspaceStore } from '@/store'
import type { Cliente, ClienteTipo, ClienteEstado, Venta2, PlantillaMensaje, PipelineCliente, EstadoPipeline, NotaVisita } from '@/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toDate } from '@/lib/services'
import { fmtARS, fmtUSD } from '@/lib/format'

const TIPOS: { id: ClienteTipo; label: string; color: string; bg: string }[] = [
  { id: 'final',      label: 'Final',      color: 'var(--blue)',   bg: 'var(--blue-bg)'   },
  { id: 'revendedor', label: 'Revendedor', color: 'var(--green)',  bg: 'var(--green-bg)'  },
  { id: 'mayorista',  label: 'Mayorista',  color: 'var(--amber)',  bg: 'var(--amber-bg)'  },
  { id: 'empresa',    label: 'Empresa',    color: '#a855f7',       bg: 'rgba(168,85,247,0.12)' },
]

// Para Verisure: RP / RE
const TIPOS_VERISURE: { id: ClienteTipo; label: string; color: string; bg: string; desc: string }[] = [
  { id: 'final',   label: 'RP', color: 'var(--brand-light)', bg: 'var(--red-bg)',  desc: 'Recurso Propio' },
  { id: 'empresa', label: 'RE', color: 'var(--blue)',        bg: 'var(--blue-bg)', desc: 'Recurso Empresa' },
]

const ESTADOS: { id: ClienteEstado; emoji: string; label: string; color: string }[] = [
  { id: 'activo',    emoji: '🟢', label: 'Activo',    color: 'var(--green)' },
  { id: 'potencial', emoji: '⭐', label: 'Potencial', color: 'var(--blue)'  },
  { id: 'dormido',   emoji: '💤', label: 'Dormido',   color: 'var(--amber)' },
  { id: 'perdido',   emoji: '❌', label: 'Perdido',   color: 'var(--text-tertiary)' },
]




type FormData = { nombre: string; telefono: string; email: string; tipo: ClienteTipo; estado: ClienteEstado; notas: string; direccion: string; dni: string; barrio: string; referido: string }
const EMPTY: FormData = { nombre: '', telefono: '', email: '', tipo: 'final', estado: 'potencial', notas: '', direccion: '', dni: '', barrio: '', referido: '' }

export default function ClientesPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const { user } = useAuthStore()
  const { workspaces } = useWorkspaceStore()
  const ws = workspaces.find(w => w.id === workspaceId)
  const esVerisure = ws?.config?.moduloVerisure === true
  const { isVendedor, isViewer } = useMemberRole(workspaceId)
  const canEdit = !isViewer
  const canDelete = isVendedor  // vendedor+ puede borrar sus propios, admin/owner todo
  const tiposDisponibles = esVerisure ? TIPOS_VERISURE : TIPOS

  const [clientes, setClientes] = useState<Cliente[]>([])
  const [ventas, setVentas] = useState<Venta2[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<ClienteTipo | 'todos'>('todos')
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<Cliente | null>(null)
  const [form, setForm] = useState<FormData>({ ...EMPTY })
  const [saving, setSaving] = useState(false)
  const [detalle, setDetalle] = useState<Cliente | null>(null)
  const [plantillas, setPlantillas] = useState<PlantillaMensaje[]>([])
  const [showPlantillas, setShowPlantillas] = useState(false)
  const [plantillaCliente, setPlantillaCliente] = useState<Cliente | null>(null)
  // Ubicación
  const [buscandoUbicacion, setBuscandoUbicacion] = useState(false)
  // Pipeline Verisure
  const [pipeline, setPipeline] = useState<PipelineCliente | null>(null)
  const [loadingPipeline, setLoadingPipeline] = useState(false)
  const [showNota, setShowNota] = useState(false)
  const [notaTexto, setNotaTexto] = useState('')
  const [notaResultado, setNotaResultado] = useState<'positivo'|'neutro'|'negativo'>('neutro')
  const [notaProximoPaso, setNotaProximoPaso] = useState('')
  const [guardandoNota, setGuardandoNota] = useState(false)
  // Seña rápida
  const [showSena, setShowSena] = useState(false)
  const [senaCliente, setSenaCliente] = useState<Cliente | null>(null)
  const [senaDesc, setSenaDesc] = useState('')
  const [senaMonto, setSenaMonto] = useState(0)
  const [senaMoneda, setSenaMoneda] = useState<'USD' | 'ARS'>('USD')

  useEffect(() => { load() }, [workspaceId])

  const load = async () => {
    try {
      const [c, v, p] = await Promise.all([
        getClientes(workspaceId),
        getVentas2(workspaceId),
        getPlantillas(workspaceId),
      ])
      setClientes(c)
      setVentas(v)
      setPlantillas(p)
    } finally { setLoading(false) }
  }

  const filtered = useMemo(() => clientes
    .filter(c => filtroTipo === 'todos' || c.tipo === filtroTipo)
    .filter(c => !search || `${c.nombre} ${c.telefono ?? ''} ${c.email ?? ''}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const ord: Record<ClienteEstado, number> = { activo: 0, potencial: 1, dormido: 2, perdido: 3 }
      return (ord[a.estado] ?? 9) - (ord[b.estado] ?? 9) || a.nombre.localeCompare(b.nombre)
    }),
  [clientes, filtroTipo, search])

  const ventasDeCliente = (nombre: string) =>
    ventas.filter(v => v.clienteNombre?.toLowerCase() === nombre.toLowerCase())
      .sort((a, b) => toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime())

  const handleSave = async () => {
    if (!form.nombre.trim() || !user) return
    setSaving(true)
    try {
      const data = {
        nombre: form.nombre, telefono: form.telefono || undefined,
        email: form.email || undefined, tipo: form.tipo, estado: form.estado,
        notas: form.notas || undefined, direccion: form.direccion || undefined,
        dni: form.dni || undefined, barrio: form.barrio || undefined,
        referido: form.referido || undefined,
      }
      if (editando) {
        await updateCliente(workspaceId, editando.id, data)
        setClientes(prev => prev.map(c => c.id === editando.id ? { ...c, ...data } : c))
        if (detalle?.id === editando.id) setDetalle(d => d ? { ...d, ...data } : d)
      } else {
        const id = await createCliente(workspaceId, { ...data, workspaceId, creadoPor: user.uid })
        setClientes(prev => [...prev, { id, ...data, workspaceId, creadoPor: user.uid, createdAt: new Date(), updatedAt: new Date() }])
      }
      setShowForm(false)
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este cliente?')) return
    await deleteCliente(workspaceId, id)
    setClientes(prev => prev.filter(c => c.id !== id))
    setDetalle(null)
  }

  const cambiarEstado = async (c: Cliente, estado: ClienteEstado) => {
    await updateCliente(workspaceId, c.id, { estado })
    setClientes(prev => prev.map(x => x.id === c.id ? { ...x, estado } : x))
    if (detalle?.id === c.id) setDetalle(d => d ? { ...d, estado } : d)
  }

  // Cargar pipeline al abrir detalle
  const abrirDetalle = async (c: Cliente) => {
    setDetalle(c)
    if (!esVerisure) return
    setLoadingPipeline(true)
    setPipeline(null)
    try {
      const p = await getPipelineByCliente(workspaceId, c.id)
      setPipeline(p)
    } finally { setLoadingPipeline(false) }
  }

  // Cambiar estado del pipeline
  const cambiarEstadoPipeline = async (estado: EstadoPipeline) => {
    if (!detalle || !user) return
    if (pipeline) {
      await updatePipeline(workspaceId, pipeline.id, { estado })
      setPipeline(p => p ? { ...p, estado } : p)
    } else {
      const id = await createPipeline(workspaceId, {
        workspaceId, clienteId: detalle.id, clienteNombre: detalle.nombre,
        estado, notas: [], kitInteres: undefined,
      })
      setPipeline({ id, workspaceId, clienteId: detalle.id, clienteNombre: detalle.nombre, estado, notas: [], creadoAt: new Date(), updatedAt: new Date() })
    }
  }

  // Guardar nota de visita
  const guardarNota = async () => {
    if (!notaTexto.trim() || !detalle || !user) return
    setGuardandoNota(true)
    try {
      const nota: NotaVisita = {
        fecha: new Date(),
        texto: notaTexto.trim(),
        resultado: notaResultado,
        proximoPaso: notaProximoPaso.trim() || undefined,
      }
      let pipelineId = pipeline?.id
      let notasActuales = pipeline?.notas ?? []
      if (!pipelineId) {
        pipelineId = await createPipeline(workspaceId, {
          workspaceId, clienteId: detalle.id, clienteNombre: detalle.nombre,
          estado: 'contactado', notas: [], kitInteres: undefined,
        })
        setPipeline({ id: pipelineId, workspaceId, clienteId: detalle.id, clienteNombre: detalle.nombre, estado: 'contactado', notas: [nota], creadoAt: new Date(), updatedAt: new Date() })
      } else {
        const nuevasNotas = await agregarNotaVisita(workspaceId, pipelineId, nota, notasActuales)
        setPipeline(p => p ? { ...p, notas: nuevasNotas as NotaVisita[] } : p)
      }
      setShowNota(false)
      setNotaTexto(''); setNotaProximoPaso(''); setNotaResultado('neutro')
    } finally { setGuardandoNota(false) }
  }

  const handleSena = async () => {
    if (!senaCliente || !senaDesc || !senaMonto || !user) return
    setSaving(true)
    try {
      await agregarMovimientoCaja(workspaceId, {
        workspaceId,
        tipo: 'seña',
        descripcion: `Seña — ${senaCliente.nombre}: ${senaDesc}`,
        monto: senaMonto,
        moneda: senaMoneda,
        esIngreso: true,
        creadoPor: user.uid,
      })
      setShowSena(false)
      setSenaDesc(''); setSenaMonto(0)
    } finally { setSaving(false) }
  }

  const abrirNuevo = () => {
    setEditando(null)
    setForm({ ...EMPTY, tipo: tiposDisponibles[0].id as ClienteTipo })
    setShowForm(true)
  }

  const abrirEditar = (c: Cliente) => {
    setEditando(c)
    setForm({
      nombre: c.nombre, telefono: c.telefono ?? '', email: c.email ?? '',
      tipo: c.tipo, estado: c.estado, notas: c.notas ?? '',
      direccion: c.direccion ?? '', dni: c.dni ?? '',
      barrio: c.barrio ?? '', referido: c.referido ?? '',
    })
    setShowForm(true)
  }

  const obtenerUbicacionGPS = () => {
    setBuscandoUbicacion(true)
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude: lat, longitude: lng } = pos.coords
        // Geocodificación inversa con Nominatim (gratis)
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
          const data = await res.json()
          const direccion = data.display_name ?? `${lat.toFixed(6)}, ${lng.toFixed(6)}`
          setForm(f => ({ ...f, direccion }))
        } catch {
          setForm(f => ({ ...f, direccion: `${lat.toFixed(6)}, ${lng.toFixed(6)}` }))
        } finally { setBuscandoUbicacion(false) }
      },
      () => { setBuscandoUbicacion(false); alert('No se pudo obtener la ubicación') },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // Usar plantilla con variables del cliente
  const usarPlantilla = (plantilla: PlantillaMensaje, cliente: Cliente) => {
    const texto = plantilla.texto
      .replace(/{nombre}/g, cliente.nombre)
      .replace(/{direccion}/g, cliente.direccion ?? '')
      .replace(/{fecha}/g, format(new Date(), "d/M/yyyy"))
      .replace(/{hora}/g, format(new Date(), "HH:mm"))
    const tel = cliente.telefono?.replace(/\D/g, '')
    const url = `https://wa.me/54${tel}?text=${encodeURIComponent(texto)}`
    window.open(url, '_blank')
    setShowPlantillas(false)
  }

  if (loading) return (
    <div className="space-y-2 mt-2">
      {[1,2,3].map(i => <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: 'var(--surface-2)' }} />)}
    </div>
  )

  return (
    <div className="space-y-3 animate-fade-in pb-4">

      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Clientes</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {clientes.filter(c => c.estado === 'activo').length} activos · {clientes.length} total
          </p>
        </div>
        {canEdit && (
          <button onClick={abrirNuevo} className="btn-primary gap-1 text-sm">
            <Plus size={15} /> Agregar
          </button>
        )}
      </div>

      {/* Filtros tipo */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4">
        <button onClick={() => setFiltroTipo('todos')}
          className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
          style={filtroTipo === 'todos'
            ? { background: 'var(--brand)', color: '#fff' }
            : { background: 'var(--surface-2)', color: 'var(--text-tertiary)', border: '1px solid var(--border)' }}>
          Todos ({clientes.length})
        </button>
        {tiposDisponibles.map(t => {
          const count = clientes.filter(c => c.tipo === t.id).length
          return (
            <button key={t.id} onClick={() => setFiltroTipo(t.id)}
              className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
              style={filtroTipo === t.id
                ? { background: 'var(--brand)', color: '#fff' }
                : { background: 'var(--surface-2)', color: 'var(--text-tertiary)', border: '1px solid var(--border)' }}>
              {t.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
        <input className="input pl-8 text-sm" placeholder="Buscar por nombre, teléfono..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {clientes.length === 0 ? 'Sin clientes todavía' : 'Sin resultados'}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
            {clientes.length === 0 ? 'Tocá + Agregar para cargar el primero' : 'Probá otro filtro'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => {
            const tipo = tiposDisponibles.find(t => t.id === c.tipo)
            const estado = ESTADOS.find(e => e.id === c.estado)
            const vsCliente = ventasDeCliente(c.nombre)
            return (
              <button key={c.id} onClick={() => abrirDetalle(c)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                {/* Avatar */}
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-base font-bold"
                  style={{ background: (tipo?.bg ?? 'var(--surface-2)'), color: (tipo?.color ?? 'var(--text-secondary)') }}>
                  {c.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{c.nombre}</span>
                    {tipo && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                        style={{ background: tipo.bg, color: tipo.color }}>
                        {tipo.label}
                      </span>
                    )}
                    <span className="text-[10px]">{estado?.emoji}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {c.telefono && <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{c.telefono}</span>}
                    {vsCliente.length > 0 && (
                      <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                        · {vsCliente.length} compra{vsCliente.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {c.telefono && (
                    <a href={`https://wa.me/54${c.telefono.replace(/\D/g,'')}`} target="_blank"
                      onClick={e => e.stopPropagation()}
                      className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: 'var(--green-bg)', color: 'var(--green)' }}>
                      <MessageCircle size={14} />
                    </a>
                  )}
                  <ChevronRight size={14} style={{ color: 'var(--text-tertiary)' }} />
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* ── Detalle cliente ────────────────────────────────────────────────── */}
      {detalle && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setDetalle(null)}>
          <div className="w-full max-w-md rounded-2xl animate-slide-up max-h-[92vh] overflow-y-auto"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="px-5 pt-5 pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold"
                    style={{ background: (tiposDisponibles.find(t => t.id === detalle.tipo)?.bg ?? 'var(--surface-2)') }}>
                    {detalle.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>{detalle.nombre}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {tiposDisponibles.find(t => t.id === detalle.tipo) && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                          style={{ background: tiposDisponibles.find(t => t.id === detalle.tipo)!.bg, color: tiposDisponibles.find(t => t.id === detalle.tipo)!.color }}>
                          {tiposDisponibles.find(t => t.id === detalle.tipo)!.label}
                        </span>
                      )}
                      <span className="text-[10px]">{ESTADOS.find(e => e.id === detalle.estado)?.emoji} {ESTADOS.find(e => e.id === detalle.estado)?.label}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setDetalle(null)} className="btn-icon">✕</button>
              </div>

              {/* Acciones rápidas */}
              <div className="flex gap-2 mt-3 flex-wrap">
                {detalle.telefono && (
                  <a href={`https://wa.me/54${detalle.telefono.replace(/\D/g,'')}`} target="_blank"
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid var(--green)' }}>
                    <MessageCircle size={15} /> WA
                  </a>
                )}
                {detalle.telefono && plantillas.length > 0 && (
                  <button onClick={() => { setPlantillaCliente(detalle); setShowPlantillas(true) }}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background: 'var(--blue-bg)', color: 'var(--blue)', border: '1px solid var(--blue)' }}>
                    <MessageCircle size={15} /> Plantilla
                  </button>
                )}
                {detalle.direccion && (
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(detalle.direccion)}`}
                    target="_blank"
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background: 'rgba(168,85,247,0.12)', color: '#a855f7', border: '1px solid #a855f7' }}>
                    <MapPin size={15} /> Maps
                  </a>
                )}
                {canEdit && (
                  <button onClick={() => { setSenaCliente(detalle); setSenaDesc(''); setSenaMonto(0); setShowSena(true) }}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background: 'var(--amber-bg)', color: 'var(--amber)', border: '1px solid var(--amber)' }}>
                    <DollarSign size={15} /> Seña
                  </button>
                )}
                {canEdit && (
                  <button onClick={() => { abrirEditar(detalle); setDetalle(null) }}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                    <Pencil size={15} />
                  </button>
                )}
                {canDelete && (
                  <button onClick={() => handleDelete(detalle.id)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl"
                    style={{ background: 'var(--red-bg)', color: 'var(--brand-light)' }}>
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border)' }} />

            {/* Info */}
            <div className="px-5 py-3 space-y-2">
              {detalle.telefono && (
                <div className="flex items-center gap-2">
                  <Phone size={13} style={{ color: 'var(--text-tertiary)' }} />
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{detalle.telefono}</span>
                </div>
              )}
              {detalle.direccion && (
                <div className="flex items-start gap-2">
                  <MapPin size={13} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{detalle.direccion}</span>
                </div>
              )}
              {detalle.barrio && (
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Barrio:</span>
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{detalle.barrio}</span>
                </div>
              )}
              {detalle.dni && (
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>DNI:</span>
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{detalle.dni}</span>
                </div>
              )}
              {detalle.referido && (
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Referido por:</span>
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{detalle.referido}</span>
                </div>
              )}
              {detalle.email && (
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Email:</span>
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{detalle.email}</span>
                </div>
              )}
              {detalle.notas && (
                <p className="text-xs italic px-1" style={{ color: 'var(--text-tertiary)' }}>{detalle.notas}</p>
              )}
            </div>

            {/* Cambiar estado */}
            <div className="px-5 pb-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-tertiary)' }}>Estado</p>
              <div className="flex gap-1.5 flex-wrap">
                {ESTADOS.map(e => (
                  <button key={e.id} onClick={() => cambiarEstado(detalle, e.id)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all"
                    style={detalle.estado === e.id
                      ? { background: 'var(--brand)', color: '#fff' }
                      : { background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                    {e.emoji} {e.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border)' }} />

            {/* Historial de compras — solo para no-Verisure */}
            {!esVerisure && (
              <div className="px-5 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-tertiary)' }}>
                  Historial de compras
                </p>
                {ventasDeCliente(detalle.nombre).length === 0 ? (
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Sin compras registradas</p>
                ) : (
                  <div className="space-y-2">
                    {ventasDeCliente(detalle.nombre).slice(0, 8).map(v => (
                      <div key={v.id} className="px-3 py-2 rounded-xl"
                        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono" style={{ color: 'var(--brand-light)' }}>{v.codigo}</span>
                          <span className="text-xs font-bold" style={{ color: 'var(--green)' }}>
                            {v.moneda === 'USD' ? fmtUSD(v.total) : fmtARS(v.total)}
                          </span>
                        </div>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                          {format(toDate(v.createdAt), "d MMM yyyy · HH:mm", { locale: es })}
                        </p>
                        <div className="mt-1 space-y-0.5">
                          {v.items.map((item, i) => (
                            <p key={i} className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                              {item.cantidad}× {item.productoNombre}
                            </p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Pipeline Verisure — seguimiento + historial de visitas */}
            {esVerisure && (
              <>
                <div style={{ borderTop: '1px solid var(--border)' }} />

                {/* Estado de la instalación */}
                <div className="px-5 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
                      Seguimiento
                    </p>
                    {loadingPipeline && <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Cargando...</span>}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {([
                      { id: 'prospecto',       label: 'Prospecto',    emoji: '🎯' },
                      { id: 'contactado',      label: 'Contactado',   emoji: '📞' },
                      { id: 'visita_agendada', label: 'Visita',       emoji: '📅' },
                      { id: 'presupuestado',   label: 'Presupuestado',emoji: '💰' },
                      { id: 'aprobado',        label: 'Aprobado',     emoji: '✅' },
                      { id: 'instalado',       label: 'Instalado',    emoji: '🛡️' },
                      { id: 'cobrado',         label: 'Cobrado',      emoji: '💵' },
                      { id: 'perdido',         label: 'Perdido',      emoji: '❌' },
                    ] as { id: EstadoPipeline; label: string; emoji: string }[]).map(e => (
                      <button key={e.id} onClick={() => cambiarEstadoPipeline(e.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all"
                        style={pipeline?.estado === e.id
                          ? { background: 'var(--brand)', color: '#fff' }
                          : { background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                        {e.emoji} {e.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border)' }} />

                {/* Historial de visitas */}
                <div className="px-5 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
                      Historial de visitas
                    </p>
                    <button onClick={() => { setShowNota(true); setNotaTexto(''); setNotaProximoPaso(''); setNotaResultado('neutro') }}
                      className="text-[10px] px-2 py-1 rounded-lg font-semibold"
                      style={{ background: 'var(--brand)', color: '#fff' }}>
                      + Agregar
                    </button>
                  </div>

                  {(!pipeline || pipeline.notas.length === 0) ? (
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Sin visitas registradas</p>
                  ) : (
                    <div className="space-y-2">
                      {pipeline.notas.map((n, i) => {
                        const colorRes = n.resultado === 'positivo' ? 'var(--green)' : n.resultado === 'negativo' ? 'var(--brand-light)' : 'var(--amber)'
                        const bgRes = n.resultado === 'positivo' ? 'var(--green-bg)' : n.resultado === 'negativo' ? 'var(--red-bg)' : 'var(--amber-bg)'
                        return (
                          <div key={i} className="px-3 py-2.5 rounded-xl"
                            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold capitalize"
                                style={{ background: bgRes, color: colorRes }}>
                                {n.resultado === 'positivo' ? '👍 Positivo' : n.resultado === 'negativo' ? '👎 Negativo' : '🔄 Neutro'}
                              </span>
                              <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                                {format(toDate(n.fecha), "d MMM yyyy · HH:mm", { locale: es })}
                              </span>
                            </div>
                            <p className="text-xs" style={{ color: 'var(--text-primary)' }}>{n.texto}</p>
                            {n.proximoPaso && (
                              <p className="text-[10px] mt-1 italic" style={{ color: 'var(--blue)' }}>
                                → {n.proximoPaso}
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Modal nueva nota de visita ───────────────────────────────────────── */}
      {showNota && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowNota(false)}>
          <div className="w-full max-w-md rounded-2xl p-5 animate-slide-up"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Registrar visita</h3>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{detalle?.nombre}</p>
              </div>
              <button onClick={() => setShowNota(false)} className="btn-icon">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label">¿Cómo salió?</label>
                <div className="flex gap-2">
                  {([
                    { id: 'positivo',  label: '👍 Positivo', color: 'var(--green)'        },
                    { id: 'neutro',    label: '🔄 Neutro',   color: 'var(--amber)'        },
                    { id: 'negativo',  label: '👎 Negativo', color: 'var(--brand-light)'  },
                  ] as { id: 'positivo'|'neutro'|'negativo'; label: string; color: string }[]).map(r => (
                    <button key={r.id} onClick={() => setNotaResultado(r.id)}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                      style={notaResultado === r.id
                        ? { background: 'var(--brand)', color: '#fff' }
                        : { background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">¿Qué pasó? *</label>
                <textarea className="input text-sm resize-none" rows={3} autoFocus
                  placeholder="Ej: Mostré el kit Alto, le pareció caro, quiere pensarlo..."
                  value={notaTexto} onChange={e => setNotaTexto(e.target.value)} />
              </div>
              <div>
                <label className="label">Próximo paso</label>
                <input className="input text-sm"
                  placeholder="Ej: Llamar el jueves, mandar presupuesto RE..."
                  value={notaProximoPaso} onChange={e => setNotaProximoPaso(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={guardarNota} disabled={!notaTexto.trim() || guardandoNota} className="btn-primary flex-1">
                {guardandoNota ? 'Guardando...' : 'Guardar visita'}
              </button>
              <button onClick={() => setShowNota(false)} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal seña ─────────────────────────────────────────────────────── */}
      {showSena && senaCliente && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowSena(false)}>
          <div className="w-full max-w-md rounded-2xl p-5 animate-slide-up"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Registrar seña</h3>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{senaCliente.nombre}</p>
              </div>
              <button onClick={() => setShowSena(false)} className="btn-icon">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label">Descripción</label>
                <input className="input text-sm" placeholder="Ej: Seña iPhone 16 Pro Black"
                  value={senaDesc} onChange={e => setSenaDesc(e.target.value)} autoFocus />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="label">Monto</label>
                  <input type="number" className="input text-sm" placeholder="0"
                    value={senaMonto || ''} onChange={e => setSenaMonto(Number(e.target.value))} />
                </div>
                <div>
                  <label className="label">Moneda</label>
                  <div className="flex gap-1.5 h-[42px] items-center">
                    {(['USD', 'ARS'] as const).map(m => (
                      <button key={m} onClick={() => setSenaMoneda(m)}
                        className="px-3 h-full rounded-xl text-sm font-bold transition-all"
                        style={senaMoneda === m
                          ? { background: 'var(--brand)', color: '#fff' }
                          : { background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleSena} disabled={!senaDesc || !senaMonto || saving} className="btn-primary flex-1">
                {saving ? 'Guardando...' : 'Registrar seña'}
              </button>
              <button onClick={() => setShowSena(false)} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal nuevo/editar cliente ─────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md rounded-2xl p-5 animate-slide-up max-h-[90vh] overflow-y-auto"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                {editando ? 'Editar cliente' : 'Nuevo cliente'}
              </h3>
              <button onClick={() => setShowForm(false)} className="btn-icon">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label">Nombre *</label>
                <input className="input text-sm" placeholder="Nombre completo"
                  value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Teléfono</label>
                  <input className="input text-sm" placeholder="221..."
                    value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input className="input text-sm" placeholder="email@..."
                    value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Tipo</label>
                <div className="flex gap-1.5 flex-wrap">
                  {tiposDisponibles.map(t => (
                    <button key={t.id} onClick={() => setForm(f => ({ ...f, tipo: t.id as ClienteTipo }))}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                      style={form.tipo === t.id
                        ? { background: 'var(--brand)', color: '#fff' }
                        : { background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Estado</label>
                <div className="flex gap-1.5 flex-wrap">
                  {ESTADOS.map(e => (
                    <button key={e.id} onClick={() => setForm(f => ({ ...f, estado: e.id }))}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                      style={form.estado === e.id
                        ? { background: 'var(--brand)', color: '#fff' }
                        : { background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                      {e.emoji} {e.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Notas</label>
                <textarea className="input text-sm resize-none" rows={2} placeholder="Observaciones..."
                  value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
              </div>

              {/* Campos extra — colapsables */}
              <details className="group">
                <summary className="text-xs font-semibold cursor-pointer select-none py-1"
                  style={{ color: 'var(--text-tertiary)' }}>
                  + Más información (dirección, DNI, barrio...)
                </summary>
                <div className="space-y-2 mt-2">
                  {/* Dirección con GPS */}
                  <div>
                    <label className="label">Dirección</label>
                    <div className="flex gap-2">
                      <input className="input text-sm flex-1" placeholder="Ej: Av. Corrientes 1234"
                        value={form.direccion} onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))} />
                      <button onClick={obtenerUbicacionGPS} disabled={buscandoUbicacion}
                        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
                        style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                        title="Obtener ubicación actual">
                        {buscandoUbicacion ? '⏳' : <Navigation size={16} />}
                      </button>
                    </div>
                    <p className="text-[10px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
                      El botón 📍 usa tu GPS para completar automáticamente
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="label">Barrio</label>
                      <input className="input text-sm" placeholder="Ej: Palermo"
                        value={form.barrio} onChange={e => setForm(f => ({ ...f, barrio: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label">DNI</label>
                      <input className="input text-sm" placeholder="12345678"
                        value={form.dni} onChange={e => setForm(f => ({ ...f, dni: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <label className="label">Referido por</label>
                    <input className="input text-sm" placeholder="Nombre de quien lo refirió"
                      value={form.referido} onChange={e => setForm(f => ({ ...f, referido: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Email</label>
                    <input className="input text-sm" placeholder="email@..."
                      value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                </div>
              </details>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleSave} disabled={!form.nombre.trim() || saving} className="btn-primary flex-1">
                {saving ? 'Guardando...' : editando ? 'Guardar cambios' : 'Agregar cliente'}
              </button>
              <button onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal plantillas ──────────────────────────────────────────────────── */}
      {showPlantillas && plantillaCliente && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowPlantillas(false)}>
          <div className="w-full max-w-md rounded-2xl p-5 animate-slide-up max-h-[85vh] overflow-y-auto"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Enviar mensaje</h3>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{plantillaCliente.nombre}</p>
              </div>
              <button onClick={() => setShowPlantillas(false)} className="btn-icon">✕</button>
            </div>
            {plantillas.length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: 'var(--text-tertiary)' }}>
                Sin plantillas — creá una en Ajustes → Plantillas
              </p>
            ) : (
              <div className="space-y-2">
                {plantillas.map(p => (
                  <button key={p.id} onClick={() => usarPlantilla(p, plantillaCliente)}
                    className="w-full flex items-start gap-3 px-3 py-3 rounded-xl text-left transition-all"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-3)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface-2)')}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{p.nombre}</p>
                      <p className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--text-tertiary)' }}>
                        {p.texto.replace(/{nombre}/g, plantillaCliente.nombre).slice(0, 80)}...
                      </p>
                    </div>
                    <MessageCircle size={16} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--green)' }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
