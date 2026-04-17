'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { Plus, Trash2, TrendingUp, DollarSign, ChevronDown } from 'lucide-react'
import {
  getVentasIPhone, createVentaIPhone, deleteVentaIPhone,
  getStockiPhones, getStockOtrosApple, getDolarConfig, getConfigIPhoneClub,
} from '@/lib/services'
import { useMemberRole } from '@/hooks/useMemberRole'
import type { VentaIPhone, StockIPhone, StockOtroApple, FormaPagoVentaIC } from '@/types'
import { fmtARS, fmtUSD } from '@/lib/format'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const FORMAS_PAGO: { id: FormaPagoVentaIC; label: string }[] = [
  { id: 'usd_efectivo',      label: '💵 USD Efectivo' },
  { id: 'usdt',              label: '🔵 USDT' },
  { id: 'transferencia_ars', label: '🏦 Transferencia ARS' },
  { id: 'manchados',         label: '🟡 Manchados' },
]

const toDate = (v: any): Date => {
  if (!v) return new Date()
  if (v instanceof Date) return v
  if (v?.seconds) return new Date(v.seconds * 1000)
  return new Date(v)
}

export default function VentasIPhonePage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const { isVendedor } = useMemberRole(workspaceId)
  const canEdit = isVendedor

  const [ventas, setVentas] = useState<VentaIPhone[]>([])
  const [iphones, setIphones] = useState<StockIPhone[]>([])
  const [otros, setOtros] = useState<StockOtroApple[]>([])
  const [dolarValor, setDolarValor] = useState(1200)
  const [margen, setMargen] = useState(20)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  // Form state
  const [itemSeleccionado, setItemSeleccionado] = useState<StockIPhone | StockOtroApple | null>(null)
  const [tipoItem, setTipoItem] = useState<'iphone' | 'otro_apple'>('iphone')
  const [precioVentaUSD, setPrecioVentaUSD] = useState(0)
  const [formaPago, setFormaPago] = useState<FormaPagoVentaIC>('usd_efectivo')
  const [clienteNombre, setClienteNombre] = useState('')
  const [notas, setNotas] = useState('')
  const [saving, setSaving] = useState(false)
  const [showSelector, setShowSelector] = useState(false)

  useEffect(() => { load() }, [workspaceId])

  const load = async () => {
    try {
      const [v, ip, ot, dolar, cfg] = await Promise.all([
        getVentasIPhone(workspaceId),
        getStockiPhones(workspaceId),
        getStockOtrosApple(workspaceId),
        getDolarConfig(workspaceId),
        getConfigIPhoneClub(workspaceId),
      ])
      setVentas(v)
      setIphones(ip.filter(i => i.stock > 0))
      setOtros(ot.filter(o => o.stock > 0 && o.disponible))
      setDolarValor(dolar?.valor ?? 1200)
      setMargen(cfg?.margenFinal ?? 20)
    } finally { setLoading(false) }
  }

  const precioCompra = itemSeleccionado
    ? ('precioUSD' in itemSeleccionado ? itemSeleccionado.precioUSD : 0)
    : 0

  const gananciaUSD = precioVentaUSD - precioCompra

  const handleSave = async () => {
    if (!itemSeleccionado || precioVentaUSD <= 0) return
    setSaving(true)
    try {
      const isIPhone = 'condicion' in itemSeleccionado
      const i = itemSeleccionado as StockIPhone
      const o = itemSeleccionado as StockOtroApple

      const descripcion = isIPhone
        ? `${i.modelo} ${i.storage} ${i.color}${i.condicion === 'usado' ? ` (usado ${i.bateria}%)` : ' (nuevo)'}`
        : `${o.tipo.toUpperCase()} ${o.modelo}${o.descripcion ? ' ' + o.descripcion : ''}`

      const precioVentaARS = formaPago === 'transferencia_ars'
        ? precioVentaUSD * dolarValor
        : undefined

      const venta: Omit<VentaIPhone, 'id' | 'creadoAt'> = {
        workspaceId,
        itemId: itemSeleccionado.id,
        tipo: isIPhone ? 'iphone' : 'otro_apple',
        descripcion,
        precioCompraUSD: precioCompra,
        precioVentaUSD,
        precioVentaARS,
        formaPago,
        dolarAlMomento: dolarValor,
        gananciaUSD,
        clienteNombre: clienteNombre || undefined,
        notas: notas || undefined,
        fecha: new Date(),
      }

      const id = await createVentaIPhone(workspaceId, venta)
      setVentas(prev => [{ id, ...venta, creadoAt: new Date() }, ...prev])
      // Reset form
      setShowForm(false)
      setItemSeleccionado(null)
      setPrecioVentaUSD(0)
      setFormaPago('usd_efectivo')
      setClienteNombre('')
      setNotas('')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta venta?')) return
    await deleteVentaIPhone(workspaceId, id)
    setVentas(prev => prev.filter(v => v.id !== id))
  }

  // Métricas del mes actual
  const ahora = new Date()
  const ventasMes = ventas.filter(v => {
    const f = toDate(v.fecha)
    return f.getMonth() === ahora.getMonth() && f.getFullYear() === ahora.getFullYear()
  })
  const gananciaMes = ventasMes.reduce((s, v) => s + v.gananciaUSD, 0)
  const unidadesMes = ventasMes.length
  const gananciaMesARS = gananciaMes * dolarValor

  // Agrupar por mes para mostrar historial
  const porMes = useMemo(() => {
    const grupos: Record<string, VentaIPhone[]> = {}
    ventas.forEach(v => {
      const f = toDate(v.fecha)
      const key = format(f, 'MMMM yyyy', { locale: es })
      if (!grupos[key]) grupos[key] = []
      grupos[key].push(v)
    })
    return grupos
  }, [ventas])

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
            iPhone Club · {ventas.length} registradas
          </p>
        </div>
        {canEdit && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white"
            style={{ background: 'var(--brand)' }}>
            <Plus size={13} /> Registrar
          </button>
        )}
      </div>

      {/* Métricas del mes */}
      <div className="grid grid-cols-3 gap-2">
        <div className="card text-center py-3">
          <p className="text-xl font-bold" style={{ color: 'var(--green)' }}>{unidadesMes}</p>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Ventas este mes</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-base font-bold" style={{ color: 'var(--brand-light)' }}>{fmtUSD(gananciaMes)}</p>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Ganancia USD</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-sm font-bold truncate" style={{ color: 'var(--amber)' }}>{fmtARS(gananciaMesARS)}</p>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>En ARS</p>
        </div>
      </div>

      {/* Historial agrupado por mes */}
      {ventas.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Sin ventas registradas</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
            Registrá tu primera venta para ver el historial y las ganancias
          </p>
        </div>
      ) : (
        Object.entries(porMes).map(([mes, items]) => {
          const ganMes = items.reduce((s, v) => s + v.gananciaUSD, 0)
          return (
            <div key={mes}>
              <div className="flex items-center justify-between mb-2 px-1">
                <p className="text-xs font-semibold uppercase tracking-wide capitalize"
                  style={{ color: 'var(--text-tertiary)' }}>{mes}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold" style={{ color: 'var(--green)' }}>
                    +{fmtUSD(ganMes)}
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                    {items.length} {items.length === 1 ? 'venta' : 'ventas'}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                {items.map(v => (
                  <div key={v.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {v.descripcion}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs font-bold" style={{ color: 'var(--brand-light)' }}>
                          {fmtUSD(v.precioVentaUSD)}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                          style={{ background: v.gananciaUSD >= 0 ? 'var(--green-bg)' : 'var(--red-bg)', color: v.gananciaUSD >= 0 ? 'var(--green)' : 'var(--brand-light)' }}>
                          {v.gananciaUSD >= 0 ? '+' : ''}{fmtUSD(v.gananciaUSD)}
                        </span>
                        <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                          {FORMAS_PAGO.find(f => f.id === v.formaPago)?.label.split(' ')[0]}
                        </span>
                        {v.clienteNombre && (
                          <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                            · {v.clienteNombre}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                        {format(toDate(v.fecha), "d 'de' MMM", { locale: es })}
                        {' · '}costo {fmtUSD(v.precioCompraUSD)}
                      </p>
                    </div>
                    {canEdit && (
                      <button onClick={() => handleDelete(v.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: 'var(--surface-2)', color: 'var(--text-tertiary)' }}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })
      )}

      {/* Modal registrar venta */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md rounded-2xl p-5 animate-slide-up max-h-[90vh] overflow-y-auto"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Registrar venta</h3>
              <button onClick={() => setShowForm(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--surface-2)', color: 'var(--text-tertiary)' }}>✕</button>
            </div>

            <div className="space-y-4">

              {/* Tipo de item */}
              <div>
                <label className="label">Tipo</label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { id: 'iphone' as const,     label: '📱 iPhone' },
                    { id: 'otro_apple' as const, label: '⌚ Otro Apple' },
                  ]).map(({ id, label }) => (
                    <button key={id} onClick={() => { setTipoItem(id); setItemSeleccionado(null) }}
                      className="py-2.5 rounded-xl text-sm font-medium transition-all"
                      style={tipoItem === id
                        ? { background: 'var(--brand)', color: '#fff' }
                        : { background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selector de item */}
              <div>
                <label className="label">Producto</label>
                <button onClick={() => setShowSelector(!showSelector)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm text-left"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: itemSeleccionado ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                  <span className="truncate">
                    {itemSeleccionado
                      ? ('condicion' in itemSeleccionado
                          ? `${(itemSeleccionado as StockIPhone).modelo} ${(itemSeleccionado as StockIPhone).storage} ${(itemSeleccionado as StockIPhone).color}`
                          : `${(itemSeleccionado as StockOtroApple).tipo} ${(itemSeleccionado as StockOtroApple).modelo}`)
                      : 'Seleccioná un producto del stock'}
                  </span>
                  <ChevronDown size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                </button>

                {showSelector && (
                  <div className="mt-1 rounded-xl overflow-hidden max-h-48 overflow-y-auto"
                    style={{ border: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                    {(tipoItem === 'iphone' ? iphones : otros).map(item => {
                      const isIPhone = 'condicion' in item
                      const label = isIPhone
                        ? `${(item as StockIPhone).modelo} ${(item as StockIPhone).storage} ${(item as StockIPhone).color}${(item as StockIPhone).condicion === 'usado' ? ` (${(item as StockIPhone).bateria}%)` : ''}`
                        : `${(item as StockOtroApple).tipo} ${(item as StockOtroApple).modelo}`
                      return (
                        <button key={item.id}
                          onClick={() => {
                            setItemSeleccionado(item)
                            setPrecioVentaUSD(item.precioUSD + (tipoItem === 'iphone' ? margen : margen))
                            setShowSelector(false)
                          }}
                          className="w-full text-left px-3 py-2.5 text-sm transition-all"
                          style={{ borderTop: '1px solid var(--border)', color: 'var(--text-primary)' }}
                          onTouchStart={e => (e.currentTarget.style.background = 'var(--surface-3)')}
                          onTouchEnd={e => (e.currentTarget.style.background = '')}>
                          <span className="block">{label}</span>
                          <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                            Costo: {fmtUSD(item.precioUSD)} · {item.stock} u en stock
                          </span>
                        </button>
                      )
                    })}
                    {(tipoItem === 'iphone' ? iphones : otros).length === 0 && (
                      <p className="text-xs text-center py-3" style={{ color: 'var(--text-tertiary)' }}>Sin stock disponible</p>
                    )}
                  </div>
                )}
              </div>

              {/* Precio de venta */}
              <div>
                <label className="label">Precio de venta (USD)</label>
                <input type="number" min="0" step="0.5" className="input text-sm"
                  value={precioVentaUSD || ''}
                  onChange={e => setPrecioVentaUSD(Number(e.target.value))}
                  placeholder="0" />
                {itemSeleccionado && precioVentaUSD > 0 && (
                  <div className="flex items-center gap-3 mt-2 px-3 py-2 rounded-lg"
                    style={{ background: gananciaUSD >= 0 ? 'var(--green-bg)' : 'var(--red-bg)' }}>
                    <TrendingUp size={14} style={{ color: gananciaUSD >= 0 ? 'var(--green)' : 'var(--brand-light)', flexShrink: 0 }} />
                    <div>
                      <p className="text-xs font-semibold" style={{ color: gananciaUSD >= 0 ? 'var(--green)' : 'var(--brand-light)' }}>
                        Ganancia: {gananciaUSD >= 0 ? '+' : ''}{fmtUSD(gananciaUSD)}
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                        Costo {fmtUSD(precioCompra)} · ARS ≈ {fmtARS(gananciaUSD * dolarValor)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Forma de pago */}
              <div>
                <label className="label">Forma de pago</label>
                <div className="grid grid-cols-2 gap-2">
                  {FORMAS_PAGO.map(({ id, label }) => (
                    <button key={id} onClick={() => setFormaPago(id)}
                      className="py-2 rounded-xl text-xs font-medium transition-all"
                      style={formaPago === id
                        ? { background: 'var(--surface-3)', color: 'var(--text-primary)', border: '1px solid var(--brand)' }
                        : { background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cliente y notas */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Cliente (opcional)</label>
                  <input className="input text-sm" placeholder="Nombre"
                    value={clienteNombre} onChange={e => setClienteNombre(e.target.value)} />
                </div>
                <div>
                  <label className="label">Notas</label>
                  <input className="input text-sm" placeholder="Opcional"
                    value={notas} onChange={e => setNotas(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={handleSave}
                disabled={!itemSeleccionado || precioVentaUSD <= 0 || saving}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all"
                style={{ background: 'var(--brand)', opacity: (!itemSeleccionado || precioVentaUSD <= 0) ? 0.5 : 1 }}>
                {saving ? 'Guardando...' : 'Registrar venta'}
              </button>
              <button onClick={() => setShowForm(false)} className="btn-secondary px-4">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
