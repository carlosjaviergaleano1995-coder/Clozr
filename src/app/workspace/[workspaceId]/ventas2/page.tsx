'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { Plus, Search, X, Check, AlertTriangle, Receipt } from 'lucide-react'
import {
  getProductos2, createVenta2, getVentas2,
  generarCodigo, registrarMovimiento, updateProducto2,
} from '@/lib/services'
import { useAuthStore } from '@/store'
import type {
  Producto2, Venta2, VentaItem2, FormaPago2,
} from '@/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toDate } from '@/lib/services'
import { fmtARS, fmtUSD, fmtMonto } from '@/lib/format'

const FORMAS_PAGO: { id: FormaPago2; label: string; emoji: string }[] = [
  { id: 'efectivo_usd', label: 'Efectivo USD', emoji: '💵' },
  { id: 'efectivo_ars', label: 'Efectivo ARS', emoji: '💴' },
  { id: 'transferencia',label: 'Transferencia', emoji: '🏦' },
  { id: 'usdt',         label: 'USDT',         emoji: '🔵' },
  { id: 'tarjeta',      label: 'Tarjeta',      emoji: '💳' },
  { id: 'permuta',      label: 'Permuta',      emoji: '🔄' },
  { id: 'otro',         label: 'Otro',         emoji: '📋' },
]





type ItemForm = {
  productoId: string
  productoNombre: string
  cantidad: number
  precioUnitario: number
  moneda: 'USD' | 'ARS'
  stockDisponible: number
  fueraDeStock: boolean
}

export default function VentasPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const { user } = useAuthStore()

  const [ventas, setVentas] = useState<Venta2[]>([])
  const [productos, setProductos] = useState<Producto2[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form
  const [clienteNombre, setClienteNombre] = useState('')
  const [formaPago, setFormaPago] = useState<FormaPago2>('efectivo_usd')
  const [notas, setNotas] = useState('')
  const [items, setItems] = useState<ItemForm[]>([])
  const [searchProd, setSearchProd] = useState('')
  const [showSearchProd, setShowSearchProd] = useState(false)
  const [ventaFueraDeStock, setVentaFueraDeStock] = useState(false)
  const [fdsNombre, setFdsNombre] = useState('')
  const [fdsPrecio, setFdsPrecio] = useState(0)
  const [fdsMoneda, setFdsMoneda] = useState<'USD' | 'ARS'>('USD')

  useEffect(() => { load() }, [workspaceId])

  const load = async () => {
    try {
      const [v, p] = await Promise.all([
        getVentas2(workspaceId),
        getProductos2(workspaceId),
      ])
      setVentas(v.sort((a, b) => toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime()))
      setProductos(p)
    } finally { setLoading(false) }
  }

  const prodsFiltrados = useMemo(() => {
    if (!searchProd) return productos.filter(p => p.stock > 0).slice(0, 20)
    return productos.filter(p =>
      `${p.marca} ${p.modelo} ${p.color ?? ''} ${p.storage ?? ''}`.toLowerCase().includes(searchProd.toLowerCase())
    ).slice(0, 20)
  }, [productos, searchProd])

  const agregarItem = (prod: Producto2) => {
    const ya = items.find(i => i.productoId === prod.id)
    if (ya) {
      setItems(prev => prev.map(i => i.productoId === prod.id
        ? { ...i, cantidad: i.cantidad + 1 } : i))
    } else {
      setItems(prev => [...prev, {
        productoId: prod.id,
        productoNombre: `${prod.marca} ${prod.modelo}${prod.storage ? ' ' + prod.storage : ''}${prod.color ? ' ' + prod.color : ''}`,
        cantidad: 1,
        precioUnitario: prod.precioUSD,
        moneda: prod.moneda,
        stockDisponible: prod.stock,
        fueraDeStock: false,
      }])
    }
    setShowSearchProd(false)
    setSearchProd('')
  }

  const agregarFueraStock = () => {
    if (!fdsNombre || !fdsPrecio) return
    setItems(prev => [...prev, {
      productoId: '',
      productoNombre: fdsNombre,
      cantidad: 1,
      precioUnitario: fdsPrecio,
      moneda: fdsMoneda,
      stockDisponible: 0,
      fueraDeStock: true,
    }])
    setFdsNombre('')
    setFdsPrecio(0)
    setVentaFueraDeStock(false)
  }

  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx))

  const updateCantidad = (idx: number, cant: number) =>
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, cantidad: Math.max(1, cant) } : item))

  const updatePrecio = (idx: number, precio: number) =>
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, precioUnitario: precio } : item))

  const total = items.reduce((acc, i) => {
    // Convertir todo a USD para el total (simplificado)
    return acc + (i.precioUnitario * i.cantidad)
  }, 0)

  const monedaMix = items.length > 0 && items.every(i => i.moneda === items[0].moneda)
    ? items[0].moneda : 'USD'

  const resetForm = () => {
    setClienteNombre('')
    setFormaPago('efectivo_usd')
    setNotas('')
    setItems([])
    setSearchProd('')
    setShowSearchProd(false)
    setVentaFueraDeStock(false)
  }

  const handleVender = async () => {
    if (items.length === 0 || !user) return
    setSaving(true)
    try {
      const codigo = await generarCodigo(workspaceId, 'VTA')

      const ventaItems: VentaItem2[] = items.map(i => ({
        productoId: i.productoId,
        productoNombre: i.productoNombre,
        cantidad: i.cantidad,
        precioUnitario: i.precioUnitario,
        moneda: i.moneda,
        fueraDeStock: i.fueraDeStock,
      }))

      const ventaId = await createVenta2(workspaceId, {
        codigo,
        workspaceId,
        clienteNombre: clienteNombre || 'Sin nombre',
        items: ventaItems,
        total,
        moneda: monedaMix,
        formaPago,
        estado: 'cerrada',
        notas: notas || undefined,
        realizadoPor: user.uid,
      })

      // Descontar stock y registrar movimientos
      for (const item of items) {
        if (item.productoId && !item.fueraDeStock) {
          const prod = productos.find(p => p.id === item.productoId)
          if (prod) {
            const nuevoStock = Math.max(0, prod.stock - item.cantidad)
            await updateProducto2(workspaceId, item.productoId, { stock: nuevoStock })
            await registrarMovimiento(workspaceId, {
              workspaceId,
              productoId: item.productoId,
              productoNombre: item.productoNombre,
              tipo: 'venta',
              cantidad: item.cantidad,
              precioUnitario: item.precioUnitario,
              moneda: item.moneda,
              ventaId,
              realizadoPor: user.uid,
            })
          }
        }
      }

      await load()
      setShowForm(false)
      resetForm()
    } finally { setSaving(false) }
  }

  if (loading) return (
    <div className="space-y-3 mt-2">
      {[1,2,3].map(i => <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: 'var(--surface-2)' }} />)}
    </div>
  )

  return (
    <div className="space-y-4 animate-fade-in pb-4">

      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Ventas</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {ventas.length} registradas
          </p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true) }} className="btn-primary gap-1 text-sm">
          <Plus size={15} /> Nueva venta
        </button>
      </div>

      {/* Lista de ventas */}
      {ventas.length === 0 ? (
        <div className="text-center py-12">
          <Receipt size={32} className="mx-auto mb-3" style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Sin ventas registradas</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Las ventas descontarán el stock automáticamente</p>
        </div>
      ) : (
        <div className="space-y-2">
          {ventas.map(v => {
            const fecha = toDate(v.createdAt)
            const tieneOOS = v.items.some(i => i.fueraDeStock)
            return (
              <div key={v.id} className="px-3 py-3 rounded-xl"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold" style={{ color: 'var(--brand-light)' }}>
                        {v.codigo}
                      </span>
                      {tieneOOS && (
                        <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full"
                          style={{ background: 'var(--amber-bg)', color: 'var(--amber)' }}>
                          <AlertTriangle size={10} /> Sin stock
                        </span>
                      )}
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {v.clienteNombre}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-sm font-bold" style={{ color: 'var(--green)' }}>
                        {fmtMonto(v.total, v.moneda)}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {FORMAS_PAGO.find(f => f.id === v.formaPago)?.emoji} {FORMAS_PAGO.find(f => f.id === v.formaPago)?.label}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {format(fecha, "d MMM HH:mm", { locale: es })}
                      </span>
                    </div>
                    <div className="mt-1 space-y-0.5">
                      {v.items.map((item, i) => (
                        <p key={i} className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                          {item.cantidad}x {item.productoNombre} — {fmtMonto(item.precioUnitario, item.moneda)}
                          {item.fueraDeStock && <span style={{ color: 'var(--amber)' }}> ⚠️</span>}
                        </p>
                      ))}
                    </div>
                    {v.notas && <p className="text-[10px] mt-1 italic" style={{ color: 'var(--text-tertiary)' }}>{v.notas}</p>}
                  </div>
                </div>
              </div>
            )
          })}
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
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Nueva venta</h3>
              <button onClick={() => setShowForm(false)} className="btn-icon">✕</button>
            </div>

            <div className="space-y-3">

              {/* Cliente */}
              <div>
                <label className="label">Cliente</label>
                <input className="input text-sm" placeholder="Nombre del cliente (opcional)"
                  value={clienteNombre} onChange={e => setClienteNombre(e.target.value)} autoFocus />
              </div>

              {/* Productos */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">Productos</label>
                  <div className="flex gap-1.5">
                    <button onClick={() => setVentaFueraDeStock(!ventaFueraDeStock)}
                      className="text-[10px] px-2 py-1 rounded-lg transition-all"
                      style={ventaFueraDeStock
                        ? { background: 'var(--amber-bg)', color: 'var(--amber)', border: '1px solid var(--amber)' }
                        : { background: 'var(--surface-2)', color: 'var(--text-tertiary)', border: '1px solid var(--border)' }}>
                      ⚠️ Fuera de stock
                    </button>
                    <button onClick={() => setShowSearchProd(!showSearchProd)}
                      className="text-xs px-2.5 py-1 rounded-lg transition-all"
                      style={{ background: 'var(--brand)', color: '#fff' }}>
                      + Del stock
                    </button>
                  </div>
                </div>

                {/* Buscador de productos del stock */}
                {showSearchProd && (
                  <div className="mb-2 rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                    <div className="relative">
                      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
                      <input className="input pl-8 text-sm rounded-none border-0 border-b"
                        style={{ borderColor: 'var(--border)' }}
                        placeholder="Buscar en inventario..." autoFocus
                        value={searchProd} onChange={e => setSearchProd(e.target.value)} />
                    </div>
                    <div className="max-h-48 overflow-y-auto" style={{ background: 'var(--surface-2)' }}>
                      {prodsFiltrados.length === 0 ? (
                        <p className="text-xs text-center py-4" style={{ color: 'var(--text-tertiary)' }}>Sin resultados</p>
                      ) : prodsFiltrados.map(p => (
                        <button key={p.id} onClick={() => agregarItem(p)}
                          className="w-full flex items-center justify-between px-3 py-2.5 text-left transition-all"
                          style={{ borderBottom: '1px solid var(--border)' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-3)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <div>
                            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                              {p.marca} {p.modelo}
                              {p.storage && ` ${p.storage}`}
                              {p.color && ` ${p.color}`}
                            </p>
                            <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                              {fmtMonto(p.precioUSD, p.moneda)} · {p.stock} u disponibles
                            </p>
                          </div>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full ml-2 flex-shrink-0"
                            style={{ background: 'var(--green-bg)', color: 'var(--green)' }}>
                            {p.stock} u
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Agregar fuera de stock */}
                {ventaFueraDeStock && (
                  <div className="mb-2 p-3 rounded-xl space-y-2"
                    style={{ background: 'var(--amber-bg)', border: '1px solid var(--amber)' }}>
                    <p className="text-[11px] font-semibold" style={{ color: 'var(--amber)' }}>
                      ⚠️ Venta fuera de stock — no descuenta inventario
                    </p>
                    <input className="input text-sm" placeholder="Nombre del producto"
                      value={fdsNombre} onChange={e => setFdsNombre(e.target.value)} />
                    <div className="flex gap-2">
                      <input type="number" className="input text-sm flex-1" placeholder="Precio"
                        value={fdsPrecio || ''} onChange={e => setFdsPrecio(Number(e.target.value))} />
                      <div className="flex gap-1">
                        {(['USD', 'ARS'] as const).map(m => (
                          <button key={m} onClick={() => setFdsMoneda(m)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all"
                            style={fdsMoneda === m
                              ? { background: 'var(--brand)', color: '#fff' }
                              : { background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button onClick={agregarFueraStock} disabled={!fdsNombre || !fdsPrecio}
                      className="w-full btn-primary text-sm py-2">
                      Agregar igual
                    </button>
                  </div>
                )}

                {/* Items agregados */}
                {items.length > 0 && (
                  <div className="space-y-2">
                    {items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 px-3 py-2 rounded-xl"
                        style={{
                          background: item.fueraDeStock ? 'var(--amber-bg)' : 'var(--surface-2)',
                          border: `1px solid ${item.fueraDeStock ? 'var(--amber)' : 'var(--border)'}`,
                        }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                            {item.fueraDeStock && '⚠️ '}{item.productoNombre}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <input type="number" min="1" value={item.cantidad}
                              onChange={e => updateCantidad(idx, Number(e.target.value))}
                              className="w-14 text-center text-xs px-1.5 py-1 rounded-lg"
                              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>×</span>
                            <input type="number" value={item.precioUnitario}
                              onChange={e => updatePrecio(idx, Number(e.target.value))}
                              className="w-24 text-xs px-2 py-1 rounded-lg"
                              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                            <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{item.moneda}</span>
                          </div>
                        </div>
                        <button onClick={() => removeItem(idx)}
                          className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: 'var(--surface-3)', color: 'var(--text-tertiary)' }}>
                          <X size={12} />
                        </button>
                      </div>
                    ))}

                    {/* Total */}
                    <div className="flex justify-between items-center px-3 py-2 rounded-xl"
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Total</span>
                      <span className="text-base font-bold" style={{ color: 'var(--green)' }}>
                        {fmtMonto(total, monedaMix)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Forma de pago */}
              <div>
                <label className="label">Forma de pago</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {FORMAS_PAGO.map(fp => (
                    <button key={fp.id} onClick={() => setFormaPago(fp.id)}
                      className="flex flex-col items-center py-2 rounded-xl text-center transition-all"
                      style={formaPago === fp.id
                        ? { background: 'var(--brand)', border: '1.5px solid var(--brand)' }
                        : { background: 'var(--surface-2)', border: '1.5px solid var(--border)' }}>
                      <span className="text-base">{fp.emoji}</span>
                      <span className={`text-[9px] font-semibold mt-0.5 leading-tight ${formaPago === fp.id ? 'text-white' : ''}`}
                        style={formaPago === fp.id ? {} : { color: 'var(--text-tertiary)' }}>
                        {fp.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="label">Notas (opcional)</label>
                <input className="input text-sm" placeholder="Observaciones..."
                  value={notas} onChange={e => setNotas(e.target.value)} />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={handleVender}
                disabled={items.length === 0 || saving}
                className="btn-primary flex-1 gap-2">
                <Check size={16} />
                {saving ? 'Registrando...' : `Registrar venta${items.length > 0 ? ` (${items.length} ítem${items.length > 1 ? 's' : ''})` : ''}`}
              </button>
              <button onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
