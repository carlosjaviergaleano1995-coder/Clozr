'use client'

import { useEffect, useState, useMemo, useTransition } from 'react'
import { useParams } from 'next/navigation'
import { Plus, Search, MessageCircle, Pencil, Trash2, ChevronRight, Phone, DollarSign, MapPin, Navigation } from 'lucide-react'
import { useMemberRole } from '@/hooks/useMemberRole'
import { useAuthStore, useWorkspaceStore } from '@/store'
import { useCustomers } from '@/hooks/useCustomers'
import { useSales } from '@/hooks/useSales'
import { usePipeline } from '@/hooks/usePipeline'
import { createCustomer, updateCustomer, deleteCustomer } from '@/features/customers/actions'
import { createPipelineItem, addActivity, updateStage } from '@/features/pipeline/actions'
import type { Customer, CustomerType, CustomerStatus, PricingPolicy } from '@/features/customers/types'
import { describePricingPolicy } from '@/features/customers/types'
import type { PipelineItem } from '@/features/pipeline/types'
// Plantillas y seña: sin equivalente canónico aún — se mantienen con servicios legacy
import { agregarMovimientoCaja, getPlantillas } from '@/lib/services'
import type { PlantillaMensaje } from '@/types'
import { format, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { toDate } from '@/lib/utils'
import { fmtARS, fmtUSD } from '@/lib/format'

// ── Constantes de UI ──────────────────────────────────────────────────────────

const TIPOS: { id: CustomerType; label: string; color: string; bg: string }[] = [
  { id: 'final',      label: 'Final',      color: 'var(--blue)',   bg: 'var(--blue-bg)'   },
  { id: 'revendedor', label: 'Revendedor', color: 'var(--green)',  bg: 'var(--green-bg)'  },
  { id: 'mayorista',  label: 'Mayorista',  color: 'var(--amber)',  bg: 'var(--amber-bg)'  },
  { id: 'empresa',    label: 'Empresa',    color: '#a855f7',       bg: 'rgba(168,85,247,0.12)' },
]

const TIPOS_VERISURE: { id: CustomerType; label: string; color: string; bg: string; desc: string }[] = [
  { id: 'final',   label: 'RP', color: 'var(--brand-light)', bg: 'var(--red-bg)',  desc: 'Recurso Propio' },
  { id: 'empresa', label: 'RE', color: 'var(--blue)',        bg: 'var(--blue-bg)', desc: 'Recurso Empresa' },
]

const ESTADOS: { id: CustomerStatus; emoji: string; label: string }[] = [
  { id: 'activo',    emoji: '🟢', label: 'Activo'    },
  { id: 'potencial', emoji: '⭐', label: 'Potencial' },
  { id: 'dormido',   emoji: '💤', label: 'Dormido'   },
  { id: 'perdido',   emoji: '❌', label: 'Perdido'   },
]

type FormData = {
  nombre: string; telefono: string; email: string
  tipo: CustomerType; estado: CustomerStatus
  notas: string; direccion: string; dni: string; barrio: string; referido: string
  pricingPolicy?: PricingPolicy
}
const EMPTY: FormData = {
  nombre: '', telefono: '', email: '', tipo: 'final', estado: 'potencial',
  notas: '', direccion: '', dni: '', barrio: '', referido: '',
  pricingPolicy: undefined,
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function ClientesPage() {
  const params      = useParams()
  const workspaceId = params.workspaceId as string
  const { user }    = useAuthStore()
  const { workspaces } = useWorkspaceStore()
  const ws          = workspaces.find(w => w.id === workspaceId)
  const esVerisure  = ws?.config?.moduloVerisure === true
  const { isVendedor, isViewerOnly } = useMemberRole(workspaceId)
  const canEdit   = !isViewerOnly
  const canDelete = isVendedor
  const tiposDisponibles = esVerisure ? TIPOS_VERISURE : TIPOS

  // ── Datos reactivos via hooks canónicos ─────────────────────────────────
  const [search, setSearch] = useState('')
  const { customers, loading } = useCustomers(workspaceId, { search })

  // ventas del cliente en detalle — reactivas por customerId
  const [detalleClienteId, setDetalleClienteId] = useState<string | null>(null)
  const { sales: ventasDelCliente } = useSales(workspaceId, {
    customerId: detalleClienteId ?? undefined,
  })

  // pipeline del cliente en detalle — reactivo por customerId
  const { items: pipelineItems, loading: loadingPipeline } = usePipeline(workspaceId, {
    customerId: detalleClienteId ?? undefined,
  })
  // El item de pipeline del cliente actual (Verisure tiene 1 por cliente)
  const pipelineItem: PipelineItem | null = pipelineItems[0] ?? null

  // Plantillas — sin equivalente canónico aún
  const [plantillas, setPlantillas] = useState<PlantillaMensaje[]>([])
  useEffect(() => {
    getPlantillas(workspaceId).then(setPlantillas)
  }, [workspaceId])

  // ── UI state ──────────────────────────────────────────────────────────────
  const [filtroTipo,  setFiltroTipo]  = useState<CustomerType | 'todos'>('todos')
  const [showForm,    setShowForm]    = useState(false)
  const [editando,    setEditando]    = useState<Customer | null>(null)
  const [form,        setForm]        = useState<FormData>({ ...EMPTY })
  const [detalle,     setDetalle]     = useState<Customer | null>(null)
  const [isPending,   startTransition] = useTransition()
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [emailError,  setEmailError]  = useState('')

  // Ubicación GPS
  const [buscandoUbicacion, setBuscandoUbicacion] = useState(false)

  // Pipeline — state de UI (el dato viene del hook usePipeline)
  const [showNota, setShowNota] = useState(false)
  const [notaTexto,       setNotaTexto]       = useState('')
  const [notaResultado,   setNotaResultado]   = useState<'positivo'|'neutro'|'negativo'>('neutro')
  const [notaProximoPaso, setNotaProximoPaso] = useState('')
  // guardandoNota eliminado — usar isPending de startTransition

  // Seña
  const [showSena,    setShowSena]    = useState(false)
  const [senaCliente, setSenaCliente] = useState<Customer | null>(null)
  const [senaDesc,    setSenaDesc]    = useState('')
  const [senaMonto,   setSenaMonto]   = useState(0)
  const [senaMoneda,  setSenaMoneda]  = useState<'USD' | 'ARS'>('USD')
  const [guardandoSena, setGuardandoSena] = useState(false)

  // Plantillas
  const [showPlantillas,   setShowPlantillas]   = useState(false)
  const [plantillaCliente, setPlantillaCliente] = useState<Customer | null>(null)

  // ── Filtrado local ────────────────────────────────────────────────────────
  // useCustomers ya filtra por search; aquí filtramos por tipo
  const filtered = useMemo(() =>
    customers
      .filter(c => filtroTipo === 'todos' || c.tipo === filtroTipo)
      .sort((a, b) => {
        const ord: Record<CustomerStatus, number> = { activo: 0, potencial: 1, dormido: 2, inactivo: 3, perdido: 4 }
        return (ord[a.estado] ?? 9) - (ord[b.estado] ?? 9) || a.nombre.localeCompare(b.nombre)
      }),
  [customers, filtroTipo])

  // ventasDelCliente viene del hook useSales({ customerId }) — ya filtrado y reactivo

  // ── NUEVA ARQUITECTURA: CRUD ──────────────────────────────────────────────

  const handleSave = () => {
    if (!form.nombre.trim()) return

    // Validar email en cliente antes de enviar al servidor
    const emailTrimmed = form.email.trim()
    if (emailTrimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      setEmailError('El email no es válido')
      return
    }
    setEmailError('')
    setFieldErrors({})

    const input = {
      nombre:   form.nombre,
      telefono: form.telefono || undefined,
      email:    form.email    || undefined,
      tipo:     form.tipo,
      estado:   form.estado,
      notas:    form.notas      || undefined,
      direccion: form.direccion || undefined,
      dni:      form.dni        || undefined,
      barrio:   form.barrio     || undefined,
      referido: form.referido   || undefined,
      pricingPolicy: form.pricingPolicy ?? undefined,
    }

    startTransition(async () => {
      if (editando) {
        const result = await updateCustomer(workspaceId, editando.id, input)
        if (!result.ok) {
          if (result.fields) setFieldErrors(result.fields)
          return
        }
        // Actualizar detalle si está abierto
        if (detalle?.id === editando.id) setDetalle(d => d ? { ...d, ...input } : d)
      } else {
        const result = await createCustomer(workspaceId, input, user?.uid)
        if (!result.ok) {
          if (result.code === 'LIMIT_REACHED') {
            window.dispatchEvent(new CustomEvent('clozr:limit-reached', { detail: result }))
          }
          if (result.fields) setFieldErrors(result.fields)
          return
        }
      }
      setShowForm(false)
      setFieldErrors({})
    })
  }

  const handleDelete = (id: string) => {
    if (!confirm('¿Eliminar este cliente?')) return
    startTransition(async () => {
      await deleteCustomer(workspaceId, id)
      setDetalle(null)
    })
  }

  const cambiarEstado = (c: Customer, estado: CustomerStatus) => {
    startTransition(async () => {
      await updateCustomer(workspaceId, c.id, { estado })
      if (detalle?.id === c.id) setDetalle(d => d ? { ...d, estado } : d)
    })
  }

  const abrirDetalle = (c: Customer) => {
    setDetalle(c)
    // Setear el customerId activa los hooks useSales y usePipeline para este cliente
    setDetalleClienteId(c.id)
  }

  const cambiarEstadoPipeline = (nuevoEstadoId: string) => {
    if (!detalle) return
    startTransition(async () => {
      if (pipelineItem) {
        // Item existente — actualizar etapa
        await updateStage(workspaceId, pipelineItem.id, {
          stageId:    nuevoEstadoId,
          stageName:  nuevoEstadoId,
          stageOrder: 0,
        })
      } else {
        // Sin item — crear uno nuevo
        await createPipelineItem(workspaceId, {
          customerId:       detalle.id,
          customerSnapshot: { nombre: detalle.nombre, telefono: detalle.telefono },
          stageId:          nuevoEstadoId,
          stageName:        nuevoEstadoId,
          stageOrder:       0,
          currency:         'ARS',
        })
      }
    })
  }

  const guardarNota = () => {
    if (!notaTexto.trim() || !detalle) return
    startTransition(async () => {
      if (pipelineItem) {
        // Item existente — agregar actividad
        await addActivity(workspaceId, pipelineItem.id, {
          type:        'visit',
          description: notaTexto.trim(),
          result:      notaProximoPaso.trim() || undefined,
          performedAt: new Date(),
        })
      } else {
        // Sin item — crear con la nota como primera actividad
        const result = await createPipelineItem(workspaceId, {
          customerId:       detalle.id,
          customerSnapshot: { nombre: detalle.nombre, telefono: detalle.telefono },
          stageId:          'contactado',
          stageName:        'Contactado',
          stageOrder:       1,
          currency:         'ARS',
        })
        // La nota se puede agregar en un segundo paso si el item se creó
      }
      setShowNota(false)
      setNotaTexto(''); setNotaProximoPaso(''); setNotaResultado('neutro')
    })
  }

  // ── Seña ──────────────────────────────────────────────────────────────────

  const handleSena = async () => {
    if (!senaCliente || !senaDesc || !senaMonto || !user) return
    setGuardandoSena(true)
    try {
      await agregarMovimientoCaja(workspaceId, {
        workspaceId, tipo: 'seña',
        descripcion: `Seña — ${senaCliente.nombre}: ${senaDesc}`,
        monto: senaMonto, moneda: senaMoneda, esIngreso: true, creadoPor: user.uid,
      })
      setShowSena(false); setSenaDesc(''); setSenaMonto(0)
    } finally { setGuardandoSena(false) }
  }

  // ── Helpers de UI ─────────────────────────────────────────────────────────

  const abrirNuevo = () => {
    setEditando(null)
    setForm({ ...EMPTY, tipo: tiposDisponibles[0].id as CustomerType })
    setFieldErrors({})
    setEmailError('')
    setShowForm(true)
  }

  const abrirEditar = (c: Customer) => {
    setEditando(c)
    setForm({
      nombre: c.nombre, telefono: c.telefono ?? '', email: c.email ?? '',
      tipo: c.tipo, estado: c.estado, notas: c.notas ?? '',
      direccion: c.direccion ?? '', dni: c.dni ?? '',
      barrio: c.barrio ?? '', referido: c.referido ?? '',
      pricingPolicy: c.pricingPolicy ?? undefined,
    })
    setFieldErrors({})
    setEmailError('')
    // Limpiar el detalle activo para que useSales y usePipeline no sigan suscritos
    setDetalleClienteId(null)
    setShowForm(true)
  }

  const obtenerUbicacionGPS = () => {
    setBuscandoUbicacion(true)
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude: lat, longitude: lng } = pos.coords
        try {
          const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
          const data = await res.json()
          setForm(f => ({ ...f, direccion: data.display_name ?? `${lat.toFixed(6)}, ${lng.toFixed(6)}` }))
        } catch {
          setForm(f => ({ ...f, direccion: `${lat.toFixed(6)}, ${lng.toFixed(6)}` }))
        } finally { setBuscandoUbicacion(false) }
      },
      () => { setBuscandoUbicacion(false); alert('No se pudo obtener la ubicación') },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  const usarPlantilla = (plantilla: PlantillaMensaje, cliente: Customer) => {
    const texto = plantilla.texto
      .replace(/{nombre}/g, cliente.nombre)
      .replace(/{direccion}/g, cliente.direccion ?? '')
      .replace(/{fecha}/g, format(new Date(), 'd/M/yyyy'))
      .replace(/{hora}/g, format(new Date(), 'HH:mm'))
    const tel = cliente.telefono?.replace(/\D/g, '')
    window.open(`https://wa.me/54${tel}?text=${encodeURIComponent(texto)}`, '_blank')
    setShowPlantillas(false)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  // ── Status config ─────────────────────────────────────────────────────────
  const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    activo:    { label: 'Activo',    color: 'var(--green)',        bg: 'var(--green-bg)'   },
    potencial: { label: 'Potencial', color: 'var(--blue)',         bg: 'var(--blue-bg)'    },
    dormido:   { label: 'Dormido',   color: 'var(--amber)',        bg: 'var(--amber-bg)'   },
    inactivo:  { label: 'Inactivo',  color: 'var(--text-tertiary)',bg: 'var(--surface-3)'  },
    perdido:   { label: 'Perdido',   color: 'var(--brand-light)',  bg: 'var(--red-bg)'     },
  }

  function iniciales(nombre: string) {
    return nombre.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
  }

  if (loading) return (
    <div className="space-y-3 pt-1 pb-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="h-6 w-24 rounded-lg" style={{ background: 'var(--surface-2)' }} />
          <div className="h-3.5 w-20 rounded" style={{ background: 'var(--surface-2)' }} />
        </div>
        <div className="h-9 w-24 rounded-xl" style={{ background: 'var(--surface-2)' }} />
      </div>
      <div className="h-10 rounded-xl" style={{ background: 'var(--surface-2)' }} />
      <div className="flex gap-2">
        {[80,70,90].map((w,i) => <div key={i} className="h-8 rounded-full flex-shrink-0" style={{ background: 'var(--surface-2)', width: `${w}px` }} />)}
      </div>
      {[1,2,3,4,5].map(i => (
        <div key={i} className="h-[70px] rounded-2xl" style={{ background: 'var(--surface-2)' }} />
      ))}
    </div>
  )

  return (
    <div className="animate-fade-in pb-6" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingTop: '4px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.4px' }}>
            Clientes
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
            {customers.filter(c => c.estado === 'activo').length} activos
            <span style={{ margin: '0 6px', opacity: 0.4 }}>·</span>
            {customers.length} total
          </p>
        </div>
        {canEdit && (
          <button
            onClick={abrirNuevo}
            className="btn-primary press"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '8px 13px', borderRadius: '12px' }}
          >
            <Plus size={13} /> Nuevo
          </button>
        )}
      </div>

      {/* ── SEARCH ─────────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative' }}>
        <Search
          size={14}
          style={{
            position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-tertiary)', pointerEvents: 'none',
          }}
        />
        <input
          className="input"
          placeholder="Buscar por nombre, teléfono..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: '36px', fontSize: '14px' }}
        />
      </div>

      {/* ── TYPE FILTER TABS ───────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px',
        marginLeft: '-16px', marginRight: '-16px', paddingLeft: '16px', paddingRight: '16px',
      }}>
        {[{ id: 'todos' as const, label: 'Todos', count: customers.length }, ...tiposDisponibles.map(t => ({
          id: t.id as CustomerType | 'todos',
          label: t.label,
          count: customers.filter(c => c.tipo === t.id).length,
        }))].map(tab => {
          const isActive = filtroTipo === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setFiltroTipo(tab.id as CustomerType | 'todos')}
              style={{
                flexShrink: 0, padding: '6px 12px', borderRadius: '20px',
                fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap',
                background: isActive ? 'var(--brand)' : 'var(--surface)',
                color:      isActive ? '#fff' : 'var(--text-secondary)',
                border:     isActive ? 'none' : '1px solid var(--border)',
                transition: 'all 0.15s',
              }}
            >
              {tab.label}
              {!isActive && tab.count > 0 && (
                <span style={{ marginLeft: '4px', opacity: 0.55 }}>({tab.count})</span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── CLIENT LIST ────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <p style={{ fontSize: '32px', marginBottom: '12px' }}>
            {customers.length === 0 ? '👥' : '🔍'}
          </p>
          <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {customers.length === 0 ? 'Sin clientes todavía' : 'Sin resultados'}
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
            {customers.length === 0
              ? 'Tocá Nuevo para agregar el primero'
              : 'Probá con otro filtro o término de búsqueda'
            }
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map(c => {
            const tipo      = tiposDisponibles.find(t => t.id === c.tipo)
            const statusCfg = STATUS_CONFIG[c.estado] ?? STATUS_CONFIG.potencial

            return (
              <button
                key={c.id}
                onClick={() => abrirDetalle(c)}
                className="press"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '16px',
                  padding: '13px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  textAlign: 'left',
                  width: '100%',
                }}
              >
                {/* Avatar with initials */}
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  background: tipo?.bg ?? 'var(--surface-2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '13px', fontWeight: 700,
                  color: tipo?.color ?? 'var(--text-secondary)',
                  flexShrink: 0,
                  border: `1px solid ${tipo?.color ?? 'var(--border)'}30`,
                }}>
                  {iniciales(c.nombre)}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {c.nombre}
                    </span>
                    {tipo && (
                      <span style={{
                        fontSize: '10px', fontWeight: 700, padding: '1px 6px',
                        borderRadius: '20px', background: tipo.bg, color: tipo.color,
                      }}>
                        {tipo.label}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                    <span style={{
                      width: '6px', height: '6px', borderRadius: '50%',
                      background: statusCfg.color, flexShrink: 0,
                      opacity: 0.8,
                    }} />
                    <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                      {statusCfg.label}
                    </span>
                    {c.barrio && (
                      <>
                        <span style={{ color: 'var(--text-tertiary)', opacity: 0.4, fontSize: '10px' }}>·</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{c.barrio}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Right: WA + chevron */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  {c.telefono && (
                    <a
                      href={`https://wa.me/54${c.telefono.replace(/\D/g, '')}`}
                      target="_blank"
                      onClick={e => e.stopPropagation()}
                      style={{
                        width: '30px', height: '30px', borderRadius: '10px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'var(--green-bg)', color: 'var(--green)',
                      }}
                    >
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

      {/* ── DETALLE SHEET ────────────────────────────────────────────────── */}
      {detalle && (() => {
        const tipo      = tiposDisponibles.find(t => t.id === detalle.tipo)
        const statusCfg = STATUS_CONFIG[detalle.estado] ?? STATUS_CONFIG.potencial
        return (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', padding: '16px' }}
            onClick={() => { setDetalle(null); setDetalleClienteId(null) }}
          >
            <div
              className="w-full max-w-md animate-slide-up"
              style={{
                background: 'var(--surface)', border: '1px solid var(--border-strong)',
                borderRadius: '24px', maxHeight: '90vh', overflowY: 'auto',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Handle */}
              <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
                <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'var(--border-strong)' }} />
              </div>

              {/* Hero header */}
              <div style={{ padding: '8px 20px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                      width: '52px', height: '52px', borderRadius: '50%',
                      background: tipo?.bg ?? 'var(--surface-2)',
                      border: `1px solid ${tipo?.color ?? 'var(--border)'}30`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '16px', fontWeight: 800,
                      color: tipo?.color ?? 'var(--text-secondary)',
                      flexShrink: 0,
                    }}>
                      {iniciales(detalle.nombre)}
                    </div>
                    <div>
                      <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                        {detalle.nombre}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '5px', flexWrap: 'wrap' }}>
                        {tipo && (
                          <span style={{
                            fontSize: '11px', fontWeight: 700, padding: '2px 8px',
                            borderRadius: '20px', background: tipo.bg, color: tipo.color,
                          }}>
                            {tipo.label}
                            {'desc' in tipo ? ` — ${(tipo as any).desc}` : ''}
                          </span>
                        )}
                        {detalle.pricingPolicy && (
                          <span style={{
                            fontSize: '11px', fontWeight: 600, padding: '2px 8px',
                            borderRadius: '20px', background: 'var(--amber-bg)', color: 'var(--amber)',
                          }}>
                            🏷️ {describePricingPolicy(detalle.pricingPolicy)}
                          </span>
                        )}
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusCfg.color }} />
                          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{statusCfg.label}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => { setDetalle(null); setDetalleClienteId(null) }}
                    className="btn-icon"
                    style={{ marginTop: '2px' }}
                  >✕</button>
                </div>

                {/* Quick action bar */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
                  {detalle.telefono && (
                    <a href={`https://wa.me/54${detalle.telefono.replace(/\D/g, '')}`} target="_blank"
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '8px 14px', borderRadius: '12px', fontSize: '13px', fontWeight: 600,
                        background: 'var(--green-bg)', color: 'var(--green)',
                        border: '1px solid rgba(48,209,88,0.25)', textDecoration: 'none',
                      }}>
                      <MessageCircle size={14} /> WhatsApp
                    </a>
                  )}
                  {detalle.telefono && plantillas.length > 0 && (
                    <button onClick={() => { setPlantillaCliente(detalle); setShowPlantillas(true) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '8px 14px', borderRadius: '12px', fontSize: '13px', fontWeight: 600,
                        background: 'var(--blue-bg)', color: 'var(--blue)',
                        border: '1px solid rgba(10,132,255,0.25)',
                      }}>
                      <MessageCircle size={14} /> Plantilla
                    </button>
                  )}
                  {detalle.direccion && (
                    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(detalle.direccion)}`}
                      target="_blank"
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '8px 14px', borderRadius: '12px', fontSize: '13px', fontWeight: 600,
                        background: 'rgba(168,85,247,0.1)', color: '#a855f7',
                        border: '1px solid rgba(168,85,247,0.25)', textDecoration: 'none',
                      }}>
                      <MapPin size={14} /> Maps
                    </a>
                  )}
                  {canEdit && (
                    <button onClick={() => { setSenaCliente(detalle); setSenaDesc(''); setSenaMonto(0); setShowSena(true) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '8px 14px', borderRadius: '12px', fontSize: '13px', fontWeight: 600,
                        background: 'var(--amber-bg)', color: 'var(--amber)',
                        border: '1px solid rgba(255,214,10,0.25)',
                      }}>
                      <DollarSign size={14} /> Seña
                    </button>
                  )}
                  <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                    {canEdit && (
                      <button onClick={() => { abrirEditar(detalle); setDetalle(null) }}
                        style={{
                          width: '36px', height: '36px', borderRadius: '10px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: 'var(--surface-2)', color: 'var(--text-secondary)',
                          border: '1px solid var(--border)',
                        }}>
                        <Pencil size={14} />
                      </button>
                    )}
                    {canDelete && (
                      <button onClick={() => handleDelete(detalle.id)}
                        style={{
                          width: '36px', height: '36px', borderRadius: '10px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: 'var(--red-bg)', color: 'var(--brand-light)',
                        }}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ height: '1px', background: 'var(--border)' }} />

              {/* Contact info */}
              <div style={{ padding: '16px 20px' }}>
                {[
                  { icon: Phone,    val: detalle.telefono,  label: 'Teléfono' },
                  { icon: MapPin,   val: detalle.direccion, label: 'Dirección' },
                ].filter(r => r.val).map(row => (
                  <div key={row.label} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                    <row.icon size={14} style={{ color: 'var(--text-tertiary)', marginTop: '2px', flexShrink: 0 }} />
                    <span style={{ fontSize: '13.5px', color: 'var(--text-primary)', lineHeight: 1.4 }}>{row.val}</span>
                  </div>
                ))}
                {[
                  { label: 'Barrio', val: detalle.barrio },
                  { label: 'DNI', val: detalle.dni },
                  { label: 'Referido por', val: detalle.referido },
                  { label: 'Email', val: detalle.email },
                ].filter(r => r.val).map(row => (
                  <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', minWidth: '70px' }}>{row.label}</span>
                    <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{row.val}</span>
                  </div>
                ))}
                {detalle.notas && (
                  <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', fontStyle: 'italic', marginTop: '4px' }}>
                    {detalle.notas}
                  </p>
                )}
              </div>

              {/* Status selector */}
              <div style={{ padding: '0 20px 16px' }}>
                <p className="section-label" style={{ marginBottom: '10px' }}>Estado</p>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {ESTADOS.map(e => {
                    const cfg = STATUS_CONFIG[e.id] ?? STATUS_CONFIG.potencial
                    const isActive = detalle.estado === e.id
                    return (
                      <button key={e.id} onClick={() => cambiarEstado(detalle, e.id)}
                        style={{
                          padding: '6px 12px', borderRadius: '20px',
                          fontSize: '12px', fontWeight: 600,
                          background: isActive ? cfg.color : 'var(--surface-2)',
                          color:      isActive ? '#000' : 'var(--text-secondary)',
                          border:     isActive ? 'none' : '1px solid var(--border)',
                          opacity:    isActive ? 1 : 0.8,
                        }}>
                        {e.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Historial de compras (non-Verisure) */}
              {!esVerisure && (
                <>
                  <div style={{ height: '1px', background: 'var(--border)' }} />
                  <div style={{ padding: '16px 20px' }}>
                    <p className="section-label" style={{ marginBottom: '12px' }}>Historial de compras</p>
                    {ventasDelCliente.length === 0 ? (
                      <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Sin compras registradas</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {ventasDelCliente.slice(0, 8).map(v => (
                          <div key={v.id} style={{
                            background: 'var(--surface-2)', border: '1px solid var(--border)',
                            borderRadius: '12px', padding: '10px 12px',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-tertiary)' }}>
                                #{v.id.slice(-5).toUpperCase()}
                              </span>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--green)' }}>
                                {v.currency === 'USD' ? fmtUSD(v.total) : fmtARS(v.total)}
                              </span>
                            </div>
                            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                              {format(v.createdAt, "d MMM yyyy · HH:mm", { locale: es })}
                              {!v.pagado && <span style={{ marginLeft: '6px', color: 'var(--amber)' }}>⏳ Pendiente</span>}
                            </p>
                            {v.items.slice(0,2).map((item, i) => (
                              <p key={i} style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                                {item.cantidad}× {item.descripcion}
                              </p>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Pipeline Verisure */}
              {esVerisure && (
                <>
                  <div style={{ height: '1px', background: 'var(--border)' }} />
                  <div style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <p className="section-label">Seguimiento</p>
                      {loadingPipeline && (
                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Cargando...</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {([
                        { id: 'prospecto', label: 'Prospecto' },
                        { id: 'contactado', label: 'Contactado' },
                        { id: 'visita_agendada', label: 'Visita' },
                        { id: 'presupuestado', label: 'Ppto.' },
                        { id: 'aprobado', label: 'Aprobado' },
                        { id: 'instalado', label: 'Instalado' },
                        { id: 'cobrado', label: 'Cobrado' },
                        { id: 'perdido', label: 'Perdido' },
                      ] as { id: string; label: string }[]).map(e => {
                        const isActive = pipelineItem?.stageId === e.id
                        return (
                          <button key={e.id} onClick={() => cambiarEstadoPipeline(e.id)}
                            style={{
                              padding: '6px 12px', borderRadius: '20px',
                              fontSize: '12px', fontWeight: 600,
                              background: isActive ? 'var(--brand)' : 'var(--surface-2)',
                              color:      isActive ? '#fff' : 'var(--text-secondary)',
                              border:     isActive ? 'none' : '1px solid var(--border)',
                            }}>
                            {e.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div style={{ height: '1px', background: 'var(--border)' }} />
                  <div style={{ padding: '16px 20px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <p className="section-label">Historial de visitas</p>
                      <button
                        onClick={() => { setShowNota(true); setNotaTexto(''); setNotaProximoPaso(''); setNotaResultado('neutro') }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '5px',
                          fontSize: '12px', fontWeight: 600, padding: '6px 11px',
                          borderRadius: '10px', background: 'var(--brand)', color: '#fff', border: 'none',
                        }}>
                        <Plus size={12} /> Agregar
                      </button>
                    </div>
                    {(!pipelineItem || pipelineItem.activities.length === 0) ? (
                      <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Sin visitas registradas</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {[...pipelineItem.activities].reverse().map((n, i) => {
                          const texto = n.description ?? ''
                          const fecha = n.performedAt instanceof Date ? n.performedAt : new Date()
                          return (
                            <div key={n.id ?? i} style={{
                              background: 'var(--surface-2)', border: '1px solid var(--border)',
                              borderRadius: '12px', padding: '12px 14px',
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span style={{
                                  fontSize: '11px', fontWeight: 600, padding: '2px 7px',
                                  borderRadius: '20px', background: 'var(--surface-3)', color: 'var(--text-secondary)',
                                }}>
                                  {n.type === 'visit' ? 'Visita' : n.type === 'call' ? 'Llamada' : 'Nota'}
                                </span>
                                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                  {format(fecha, "d MMM · HH:mm", { locale: es })}
                                </span>
                              </div>
                              <p style={{ fontSize: '13.5px', color: 'var(--text-primary)', lineHeight: 1.4 }}>{texto}</p>
                              {n.result && (
                                <p style={{ fontSize: '12px', color: 'var(--amber)', marginTop: '6px', fontWeight: 500 }}>
                                  → {n.result}
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
        )
      })()}

      {/* ── NOTA MODAL ───────────────────────────────────────────────────── */}
      {showNota && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', padding: '16px' }}
          onClick={() => setShowNota(false)}>
          <div className="w-full max-w-md animate-slide-up"
            style={{ background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: '24px', padding: '20px' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Registrar visita</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{detalle?.nombre}</p>
              </div>
              <button onClick={() => setShowNota(false)} className="btn-icon">✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="label">¿Cómo salió?</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {(['positivo','neutro','negativo'] as const).map(r => (
                    <button key={r} onClick={() => setNotaResultado(r)}
                      style={{
                        padding: '8px', borderRadius: '10px', fontSize: '12px', fontWeight: 600,
                        background: notaResultado === r ? 'var(--brand)' : 'var(--surface-2)',
                        color:      notaResultado === r ? '#fff' : 'var(--text-secondary)',
                        border:     notaResultado === r ? 'none' : '1px solid var(--border)',
                      }}>
                      {r === 'positivo' ? '👍 Positivo' : r === 'neutro' ? '🔄 Neutro' : '👎 Negativo'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">¿Qué pasó? *</label>
                <textarea className="input text-sm resize-none" rows={3} autoFocus
                  placeholder="Ej: Mostré el kit Alto, le pareció caro..."
                  value={notaTexto} onChange={e => setNotaTexto(e.target.value)} />
              </div>
              <div>
                <label className="label">Próximo paso</label>
                <input className="input text-sm" placeholder="Ej: Llamar el jueves..."
                  value={notaProximoPaso} onChange={e => setNotaProximoPaso(e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button onClick={guardarNota} disabled={!notaTexto.trim() || isPending} className="btn-primary flex-1">
                {isPending ? 'Guardando...' : 'Guardar visita'}
              </button>
              <button onClick={() => setShowNota(false)} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── SEÑA MODAL ───────────────────────────────────────────────────── */}
      {showSena && senaCliente && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', padding: '16px' }}
          onClick={() => setShowSena(false)}>
          <div className="w-full max-w-md animate-slide-up"
            style={{ background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: '24px', padding: '20px' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Registrar seña</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{senaCliente.nombre}</p>
              </div>
              <button onClick={() => setShowSena(false)} className="btn-icon">✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="label">Descripción</label>
                <input className="input text-sm" placeholder="Ej: Seña iPhone 16 Pro Black"
                  value={senaDesc} onChange={e => setSenaDesc(e.target.value)} autoFocus />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <label className="label">Monto</label>
                  <input type="number" className="input text-sm" placeholder="0"
                    value={senaMonto || ''} onChange={e => setSenaMonto(Number(e.target.value))} />
                </div>
                <div>
                  <label className="label">Moneda</label>
                  <div style={{ display: 'flex', gap: '6px', height: '42px', alignItems: 'center' }}>
                    {(['USD','ARS'] as const).map(m => (
                      <button key={m} onClick={() => setSenaMoneda(m)}
                        style={{
                          padding: '0 14px', height: '100%', borderRadius: '10px',
                          fontSize: '13px', fontWeight: 700,
                          background: senaMoneda === m ? 'var(--brand)' : 'var(--surface-2)',
                          color:      senaMoneda === m ? '#fff' : 'var(--text-secondary)',
                          border:     senaMoneda === m ? 'none' : '1px solid var(--border)',
                        }}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button onClick={handleSena} disabled={!senaDesc || !senaMonto || guardandoSena} className="btn-primary flex-1">
                {guardandoSena ? 'Guardando...' : 'Registrar seña'}
              </button>
              <button onClick={() => setShowSena(false)} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── FORM CLIENTE ─────────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', padding: '16px' }}
          onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md animate-slide-up max-h-[90vh] overflow-y-auto"
            style={{ background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: '24px', padding: '20px' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {editando ? 'Editar cliente' : 'Nuevo cliente'}
              </h3>
              <button onClick={() => setShowForm(false)} className="btn-icon">✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {/* Nombre — obligatorio */}
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '6px' }}>
                  <label className="label" style={{ margin: 0 }}>Nombre</label>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--brand-light)' }}>Obligatorio</span>
                </div>
                <input className="input text-sm" placeholder="Nombre y apellido"
                  value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} autoFocus />
                {fieldErrors.nombre && (
                  <p style={{ fontSize: '12px', color: 'var(--brand-light)', marginTop: '5px' }}>
                    {fieldErrors.nombre}
                  </p>
                )}
              </div>

              {/* Teléfono + Email — opcionales */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '6px' }}>
                    <label className="label" style={{ margin: 0 }}>Teléfono</label>
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Opcional</span>
                  </div>
                  <input className="input text-sm" placeholder="221..."
                    value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '6px' }}>
                    <label className="label" style={{ margin: 0 }}>Email</label>
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Opcional</span>
                  </div>
                  <input
                    className="input text-sm"
                    placeholder="nombre@mail.com"
                    type="email"
                    inputMode="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    value={form.email}
                    onChange={e => {
                      setForm(f => ({ ...f, email: e.target.value }))
                      setEmailError('')  // limpiar error al escribir
                    }}
                    style={{
                      borderColor: emailError ? 'var(--brand-light)' : undefined,
                    }}
                  />
                  {(emailError || fieldErrors.email) && (
                    <p style={{ fontSize: '12px', color: 'var(--brand-light)', marginTop: '5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {emailError || fieldErrors.email}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label className="label">Tipo</label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {tiposDisponibles.map(t => (
                    <button key={t.id} onClick={() => setForm(f => ({ ...f, tipo: t.id as CustomerType }))}
                      style={{
                        padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                        background: form.tipo === t.id ? 'var(--brand)' : 'var(--surface-2)',
                        color:      form.tipo === t.id ? '#fff' : 'var(--text-secondary)',
                        border:     form.tipo === t.id ? 'none' : '1px solid var(--border)',
                      }}>
                      {t.label}
                      {'desc' in t ? ` — ${(t as any).desc}` : ''}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Estado</label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {ESTADOS.map(e => (
                    <button key={e.id} onClick={() => setForm(f => ({ ...f, estado: e.id }))}
                      style={{
                        padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                        background: form.estado === e.id ? 'var(--brand)' : 'var(--surface-2)',
                        color:      form.estado === e.id ? '#fff' : 'var(--text-secondary)',
                        border:     form.estado === e.id ? 'none' : '1px solid var(--border)',
                      }}>
                      {e.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '6px' }}>
                  <label className="label" style={{ margin: 0 }}>Notas</label>
                  <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Opcional</span>
                </div>
                <textarea className="input text-sm resize-none" rows={2} placeholder="Observaciones..."
                  value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
              </div>
              {/* Política de precios */}
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '8px' }}>
                  <label className="label" style={{ margin: 0 }}>Precio personalizado</label>
                  <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Opcional</span>
                </div>

                {/* Selector de tipo de política */}
                <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
                  {[
                    { type: undefined,      label: 'Sin política', desc: 'Precio de lista' },
                    { type: 'percentage',   label: '% Descuento',  desc: 'Porcentaje fijo' },
                    { type: 'volume',       label: 'Por volumen',  desc: 'Escalonado' },
                    { type: 'fixed',        label: 'Precio fijo',  desc: 'Por producto' },
                  ].map(opt => {
                    const isActive = (form.pricingPolicy?.type ?? undefined) === opt.type
                    return (
                      <button key={opt.label} type="button"
                        onClick={() => setForm(f => ({
                          ...f,
                          pricingPolicy: opt.type === undefined ? undefined
                            : opt.type === 'percentage' ? { type: 'percentage', percentage: -5 }
                            : opt.type === 'volume'     ? { type: 'volume', tiers: [{ minQty: 1, percentage: 0 }, { minQty: 5, percentage: -5 }] }
                            : { type: 'fixed', prices: {} }
                        }))}
                        style={{
                          padding: '6px 11px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                          background: isActive ? 'var(--brand)' : 'var(--surface-2)',
                          color:      isActive ? '#fff' : 'var(--text-secondary)',
                          border:     isActive ? 'none' : '1px solid var(--border)',
                        }}>
                        {opt.label}
                      </button>
                    )
                  })}
                </div>

                {/* Campos según tipo de política */}
                {form.pricingPolicy?.type === 'percentage' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Aplicar</span>
                    <input
                      type="number" min="-99" max="100" step="0.5"
                      className="input text-sm" style={{ width: '80px' }}
                      value={form.pricingPolicy.percentage}
                      onChange={e => setForm(f => f.pricingPolicy?.type === 'percentage'
                        ? { ...f, pricingPolicy: { type: 'percentage', percentage: Number(e.target.value) } }
                        : f
                      )}
                    />
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>% sobre el precio de lista</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                      (negativo = descuento)
                    </span>
                  </div>
                )}

                {form.pricingPolicy?.type === 'volume' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {form.pricingPolicy.tiers.map((tier: {minQty:number;percentage:number}, idx: number) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', flexShrink: 0 }}>Desde</span>
                        <input type="number" min="1" className="input text-sm" style={{ width: '60px' }}
                          value={tier.minQty}
                          onChange={e => setForm(f => {
                            if (f.pricingPolicy?.type !== 'volume') return f
                            const tiers = [...f.pricingPolicy.tiers]
                            tiers[idx] = { ...tiers[idx], minQty: Number(e.target.value) }
                            return { ...f, pricingPolicy: { type: 'volume', tiers } }
                          })} />
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', flexShrink: 0 }}>u:</span>
                        <input type="number" min="-99" max="100" step="0.5" className="input text-sm" style={{ width: '70px' }}
                          value={tier.percentage}
                          onChange={e => setForm(f => {
                            if (f.pricingPolicy?.type !== 'volume') return f
                            const tiers = [...f.pricingPolicy.tiers]
                            tiers[idx] = { ...tiers[idx], percentage: Number(e.target.value) }
                            return { ...f, pricingPolicy: { type: 'volume', tiers } }
                          })} />
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', flexShrink: 0 }}>%</span>
                        {form.pricingPolicy?.type === "volume" && form.pricingPolicy.tiers.length > 1 && (
                          <button type="button" onClick={() => setForm(f => {
                            if (f.pricingPolicy?.type !== 'volume') return f
                            return { ...f, pricingPolicy: { type: 'volume', tiers: f.pricingPolicy.tiers.filter((_: unknown, i: number) => i !== idx) } }
                          })} style={{ color: 'var(--brand-light)', fontSize: '16px', lineHeight: 1 }}>×</button>
                        )}
                      </div>
                    ))}
                    <button type="button"
                      onClick={() => setForm(f => {
                        if (f.pricingPolicy?.type !== 'volume') return f
                        const lastMin = f.pricingPolicy.tiers.at(-1)?.minQty ?? 0
                        return { ...f, pricingPolicy: { type: 'volume', tiers: [...f.pricingPolicy.tiers, { minQty: lastMin + 5, percentage: -10 }] } }
                      })}
                      style={{ fontSize: '12px', color: 'var(--brand)', fontWeight: 600, textAlign: 'left', paddingTop: '2px' }}>
                      + Agregar tramo
                    </button>
                  </div>
                )}

                {form.pricingPolicy?.type === 'fixed' && (
                  <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                    Los precios fijos se configuran desde la venta, al seleccionar el producto.
                  </p>
                )}
              </div>

              <details>
                <summary style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px 0' }}>
                  Más información (dirección, DNI, barrio...)
                </summary>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                  <div>
                    <label className="label">Dirección</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input className="input text-sm" style={{ flex: 1 }} placeholder="Av. Corrientes 1234"
                        value={form.direccion} onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))} />
                      <button onClick={obtenerUbicacionGPS} disabled={buscandoUbicacion}
                        style={{
                          width: '42px', height: '42px', borderRadius: '10px', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: 'var(--surface-2)', color: 'var(--text-secondary)',
                          border: '1px solid var(--border)',
                        }}>
                        {buscandoUbicacion ? '⏳' : <Navigation size={16} />}
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
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
                </div>
              </details>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
              <button onClick={handleSave} disabled={!form.nombre.trim() || isPending} className="btn-primary flex-1">
                {isPending ? 'Guardando...' : editando ? 'Guardar cambios' : 'Agregar cliente'}
              </button>
              <button onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── PLANTILLAS MODAL ─────────────────────────────────────────────── */}
      {showPlantillas && plantillaCliente && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', padding: '16px' }}
          onClick={() => setShowPlantillas(false)}>
          <div className="w-full max-w-md animate-slide-up max-h-[85vh] overflow-y-auto"
            style={{ background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: '24px', padding: '20px' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Enviar mensaje</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{plantillaCliente.nombre}</p>
              </div>
              <button onClick={() => setShowPlantillas(false)} className="btn-icon">✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {plantillas.map(p => (
                <button key={p.id} onClick={() => usarPlantilla(p, plantillaCliente)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: '12px',
                    padding: '12px 14px', borderRadius: '14px', textAlign: 'left',
                    background: 'var(--surface-2)', border: '1px solid var(--border)',
                  }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>{p.nombre}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '3px' }}>
                      {p.texto.replace(/{nombre}/g, plantillaCliente.nombre).slice(0, 80)}...
                    </p>
                  </div>
                  <MessageCircle size={16} style={{ color: 'var(--green)', flexShrink: 0, marginTop: '2px' }} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
