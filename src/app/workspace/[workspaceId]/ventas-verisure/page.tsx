'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { Plus, ChevronDown, ChevronUp } from 'lucide-react'
import { getVentas, createVenta, getClientes } from '@/lib/services'
import { useAuthStore } from '@/store'
import type { Cliente } from '@/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toDate } from '@/lib/services'

// ── Datos del plan ────────────────────────────────────────────────────────────
const KITS = [
  { id: 'catalogo',  label: 'Catálogo',    re: 140000, rp: 200000 },
  { id: 'alto',      label: 'Alto',        re: 70000,  rp: 100000  },
  { id: 'medio',     label: 'Medio',       re: 35000,  rp: 50000   },
  { id: 'bajo',      label: 'Bajo',        re: 0,      rp: 0        },
  { id: 'catalogo2', label: 'Catálogo +',  re: 175000, rp: 250000  },
  { id: 'alto2',     label: 'Alto +',      re: 140000, rp: 200000  },
  { id: 'mediobajo', label: 'Medio/Bajo +',re: 56000,  rp: 80000   },
]

const EXTRAS: { id: string; label: string; precios: { nivel: string; cantidades: { x: number; precio: number }[] }[] }[] = [
  { id: 'shock',    label: 'Shock Sensor', precios: [
    { nivel: 'alto', cantidades: [{ x:1, precio:8000 },{ x:2, precio:20000 },{ x:3, precio:30000 },{ x:4, precio:40000 },{ x:6, precio:60000 }] },
    { nivel: 'bajo', cantidades: [{ x:1, precio:4000 },{ x:2, precio:10000 },{ x:3, precio:15000 },{ x:4, precio:20000 },{ x:6, precio:30000 }] },
  ]},
  { id: 'orion',    label: 'Orion', precios: [
    { nivel: 'alto', cantidades: [{ x:1, precio:60000 },{ x:2, precio:100000 }] },
    { nivel: 'bajo', cantidades: [{ x:1, precio:20000 },{ x:2, precio:50000  }] },
  ]},
  { id: 'aquila',   label: 'Aquila Outdoor', precios: [
    { nivel: 'alto', cantidades: [{ x:1, precio:20000 },{ x:2, precio:70000 }] },
    { nivel: 'bajo', cantidades: [{ x:1, precio:40000 },{ x:2, precio:80000 }] },
  ]},
  { id: 'zerovision', label: 'Zerovision', precios: [
    { nivel: 'alto', cantidades: [{ x:1, precio:100000 }] },
    { nivel: 'bajo', cantidades: [{ x:1, precio:24000  }] },
  ]},
  { id: 'boton',    label: 'Botón emergencias', precios: [
    { nivel: 'alto',  cantidades: [{ x:1, precio:20000 },{ x:2, precio:45000 }] },
    { nivel: 'medio', cantidades: [{ x:1, precio:10000 },{ x:2, precio:20000 }] },
  ]},
  { id: 'arlo_in',  label: 'Arlo Indoor', precios: [
    { nivel: 'alto',  cantidades: [{ x:1, precio:40000 },{ x:2, precio:80000 }] },
    { nivel: 'medio', cantidades: [{ x:1, precio:15000 },{ x:2, precio:30000 }] },
  ]},
  { id: 'arlo_out', label: 'Arlo Outdoor', precios: [
    { nivel: 'alto',  cantidades: [{ x:1, precio:50000 },{ x:2, precio:100000 }] },
    { nivel: 'medio', cantidades: [{ x:1, precio:12000 },{ x:2, precio:24000  }] },
  ]},
  { id: 'panel',    label: 'Panel de control', precios: [
    { nivel: 'alto',  cantidades: [{ x:1, precio:70000 }] },
    { nivel: 'medio', cantidades: [{ x:1, precio:20000 }] },
  ]},
  { id: 'starkey',  label: 'Starkey', precios: [
    { nivel: 'alto',  cantidades: [{ x:1, precio:20000 }] },
    { nivel: 'medio', cantidades: [{ x:1, precio:8000  }] },
  ]},
]

const fmtARS = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`

type ExtraSeleccionado = { extraId: string; nivel: 'alto'|'bajo'|'medio'|string; cantidad: number; precio: number }

export default function VentasVerisurePage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const { user } = useAuthStore()

  const [ventas, setVentas] = useState<any[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form
  const [tipoVenta, setTipoVenta] = useState<'rp'|'re'>('rp')
  const [kitId, setKitId] = useState('alto')
  const [clienteNombre, setClienteNombre] = useState('')
  const [extras, setExtras] = useState<ExtraSeleccionado[]>([])
  const [notas, setNotas] = useState('')
  const [showExtras, setShowExtras] = useState(false)

  useEffect(() => { load() }, [workspaceId])

  const load = async () => {
    try {
      const [v, c] = await Promise.all([getVentas(workspaceId), getClientes(workspaceId)])
      setVentas(v.sort((a: any, b: any) => toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime()))
      setClientes(c)
    } finally { setLoading(false) }
  }

  const kitSeleccionado = KITS.find(k => k.id === kitId)!

  const comisionKit = useMemo(() => {
    return tipoVenta === 'rp' ? kitSeleccionado.rp : kitSeleccionado.re
  }, [tipoVenta, kitId])

  const comisionExtras = useMemo(() =>
    extras.reduce((acc, e) => acc + e.precio, 0), [extras])

  const totalComision = comisionKit + comisionExtras

  const agregarExtra = (extraId: string, nivel: string, cantidad: number, precio: number) => {
    setExtras(prev => {
      const yaExiste = prev.findIndex(e => e.extraId === extraId)
      if (yaExiste >= 0) {
        const nuevo = [...prev]
        nuevo[yaExiste] = { extraId, nivel: nivel as any, cantidad, precio }
        return nuevo
      }
      return [...prev, { extraId, nivel: nivel as any, cantidad, precio }]
    })
  }

  const quitarExtra = (extraId: string) =>
    setExtras(prev => prev.filter(e => e.extraId !== extraId))

  const handleGuardar = async () => {
    if (!kitId || !user) return
    setSaving(true)
    try {
      const extrasLabel = extras.map(e => {
        const extra = EXTRAS.find(x => x.id === e.extraId)
        return `${extra?.label} x${e.cantidad}`
      }).join(', ')

      const descripcion = `${kitSeleccionado.label}${extrasLabel ? ' + ' + extrasLabel : ''}`

      await createVenta(workspaceId, {
        workspaceId,
        clienteId: '',
        clienteNombre: clienteNombre || 'Sin nombre',
        items: [{ productoId: kitId, nombre: descripcion, cantidad: 1, precioUnitario: totalComision, descuento: 0 }],
        subtotal: totalComision,
        total: totalComision,
        moneda: 'ARS',
        formaPago: tipoVenta.toUpperCase(),
        estado: 'completada',
        notas: notas || undefined,
        creadoPor: user.uid,
      } as any)

      await load()
      setShowForm(false)
      setClienteNombre(''); setExtras([]); setNotas(''); setKitId('alto')
    } finally { setSaving(false) }
  }

  const ventasHoy = ventas.filter((v: any) =>
    toDate(v.createdAt).toISOString().slice(0,10) === new Date().toISOString().slice(0,10))
  const ventasRP = ventas.filter((v: any) => v.formaPago === 'RP')
  const ventasRE = ventas.filter((v: any) => v.formaPago === 'RE')

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
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Ventas</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {ventasRP.length} RP · {ventasRE.length} RE este mes
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary gap-1 text-sm">
          <Plus size={15} /> Nueva venta
        </button>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-3 gap-2">
        <div className="px-3 py-2.5 rounded-xl text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-xl font-bold" style={{ color: 'var(--brand)' }}>{ventasRP.length}</p>
          <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>RP mes</p>
        </div>
        <div className="px-3 py-2.5 rounded-xl text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-xl font-bold" style={{ color: 'var(--blue)' }}>{ventasRE.length}</p>
          <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>RE mes</p>
        </div>
        <div className="px-3 py-2.5 rounded-xl text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-xl font-bold" style={{ color: 'var(--green)' }}>{ventasHoy.length}</p>
          <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Hoy</p>
        </div>
      </div>

      {/* Lista ventas */}
      {ventas.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Sin ventas registradas</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Registrá tu primera instalación</p>
        </div>
      ) : (
        <div className="space-y-2">
          {ventas.slice(0, 20).map((v: any) => (
            <div key={v.id} className="px-3 py-3 rounded-xl"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                    style={v.formaPago === 'RP'
                      ? { background: 'var(--red-bg)', color: 'var(--brand-light)' }
                      : { background: 'var(--blue-bg)', color: 'var(--blue)' }}>
                    {v.formaPago}
                  </span>
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {v.clienteNombre}
                  </span>
                </div>
                <span className="text-sm font-bold" style={{ color: 'var(--green)' }}>
                  {fmtARS(v.total)}
                </span>
              </div>
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
                {v.items?.[0]?.nombre} · {format(toDate(v.createdAt), "d MMM HH:mm", { locale: es })}
              </p>
              {v.notas && <p className="text-[10px] mt-0.5 italic" style={{ color: 'var(--text-tertiary)' }}>{v.notas}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Modal nueva venta */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md rounded-2xl p-5 animate-slide-up max-h-[92vh] overflow-y-auto"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Nueva venta Verisure</h3>
              <button onClick={() => setShowForm(false)} className="btn-icon">✕</button>
            </div>

            <div className="space-y-3">

              {/* RP / RE */}
              <div>
                <label className="label">Tipo de venta</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'rp', label: 'RP', desc: 'Recurso Propio', color: 'var(--brand)' },
                    { id: 're', label: 'RE', desc: 'Recurso Empresa', color: 'var(--blue)' },
                  ].map(t => (
                    <button key={t.id} onClick={() => setTipoVenta(t.id as any)}
                      className="py-3 rounded-2xl text-center transition-all"
                      style={tipoVenta === t.id
                        ? { background: t.color + '18', border: `2px solid ${t.color}` }
                        : { background: 'var(--surface-2)', border: '2px solid transparent' }}>
                      <p className="text-lg font-bold" style={{ color: tipoVenta === t.id ? t.color : 'var(--text-primary)' }}>{t.label}</p>
                      <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cliente */}
              <div>
                <label className="label">Cliente</label>
                <input className="input text-sm" placeholder="Nombre del cliente"
                  value={clienteNombre} onChange={e => setClienteNombre(e.target.value)}
                  list="clientes-list" autoFocus />
                <datalist id="clientes-list">
                  {clientes.map(c => <option key={c.id} value={c.nombre} />)}
                </datalist>
              </div>

              {/* Kit */}
              <div>
                <label className="label">Kit</label>
                <div className="space-y-1.5">
                  {KITS.map(k => (
                    <button key={k.id} onClick={() => setKitId(k.id)}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all"
                      style={kitId === k.id
                        ? { background: 'rgba(232,0,29,0.08)', border: '1.5px solid var(--brand)' }
                        : { background: 'var(--surface-2)', border: '1.5px solid var(--border)' }}>
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{k.label}</span>
                      <span className="text-sm font-bold"
                        style={{ color: kitId === k.id ? 'var(--brand-light)' : 'var(--text-tertiary)' }}>
                        {fmtARS(tipoVenta === 'rp' ? k.rp : k.re)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Extras */}
              <div>
                <button onClick={() => setShowExtras(!showExtras)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Extras {extras.length > 0 ? `(${extras.length} seleccionados)` : ''}
                  </span>
                  {showExtras ? <ChevronUp size={16} style={{ color: 'var(--text-tertiary)' }} />
                    : <ChevronDown size={16} style={{ color: 'var(--text-tertiary)' }} />}
                </button>

                {showExtras && (
                  <div className="mt-2 space-y-3 px-1">
                    {EXTRAS.map(extra => {
                      const seleccionado = extras.find(e => e.extraId === extra.id)
                      return (
                        <div key={extra.id}>
                          <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                            {extra.label}
                            {seleccionado && (
                              <button onClick={() => quitarExtra(extra.id)}
                                className="ml-2 text-[10px] px-1.5 py-0.5 rounded"
                                style={{ background: 'var(--red-bg)', color: 'var(--brand-light)' }}>
                                quitar
                              </button>
                            )}
                          </p>
                          <div className="space-y-1">
                            {extra.precios.map(nivel => (
                              <div key={nivel.nivel}>
                                <p className="text-[10px] mb-1 capitalize" style={{ color: 'var(--text-tertiary)' }}>
                                  {nivel.nivel}
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {nivel.cantidades.map(opcion => {
                                    const isSelected = seleccionado?.extraId === extra.id &&
                                      seleccionado?.nivel === nivel.nivel &&
                                      seleccionado?.cantidad === opcion.x
                                    return (
                                      <button key={opcion.x}
                                        onClick={() => agregarExtra(extra.id, nivel.nivel, opcion.x, opcion.precio)}
                                        className="px-2.5 py-1.5 rounded-xl text-[11px] font-medium transition-all"
                                        style={isSelected
                                          ? { background: 'var(--brand)', color: '#fff' }
                                          : { background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                                        x{opcion.x} · {fmtARS(opcion.precio)}
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Total comisión */}
              <div className="px-3 py-3 rounded-xl"
                style={{ background: 'var(--green-bg)', border: '1px solid var(--green)' }}>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold" style={{ color: 'var(--green)' }}>Comisión estimada</span>
                  <span className="text-lg font-bold" style={{ color: 'var(--green)' }}>{fmtARS(totalComision)}</span>
                </div>
                {extras.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    <div className="flex justify-between">
                      <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Kit {kitSeleccionado.label}</span>
                      <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{fmtARS(comisionKit)}</span>
                    </div>
                    {extras.map(e => {
                      const extra = EXTRAS.find(x => x.id === e.extraId)
                      return (
                        <div key={e.extraId} className="flex justify-between">
                          <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                            {extra?.label} x{e.cantidad}
                          </span>
                          <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{fmtARS(e.precio)}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Notas */}
              <div>
                <label className="label">Notas (opcional)</label>
                <textarea className="input text-sm resize-none" rows={2} placeholder="Observaciones, dirección..."
                  value={notas} onChange={e => setNotas(e.target.value)} />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={handleGuardar} disabled={!kitId || saving} className="btn-primary flex-1">
                {saving ? 'Guardando...' : `Registrar venta ${tipoVenta.toUpperCase()} · ${fmtARS(totalComision)}`}
              </button>
              <button onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
