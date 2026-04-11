'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { Plus, ArrowDown, ArrowUp, ShoppingCart, Wrench, Settings2, Filter } from 'lucide-react'
import {
  getMovimientos, registrarMovimiento,
  getProductos2, updateProducto2,
} from '@/lib/services'
import { useAuthStore } from '@/store'
import type { MovimientoStock, MovimientoTipo, Producto2 } from '@/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toDate } from '@/lib/services'

const TIPO_CONFIG: Record<MovimientoTipo, { label: string; icon: any; color: string; bg: string; signo: string }> = {
  entrada: { label: 'Entrada',  icon: ArrowDown,    color: 'var(--green)',       bg: 'var(--green-bg)',  signo: '+' },
  salida:  { label: 'Salida',   icon: ArrowUp,      color: 'var(--brand-light)', bg: 'var(--red-bg)',    signo: '-' },
  venta:   { label: 'Venta',    icon: ShoppingCart, color: 'var(--blue)',        bg: 'var(--blue-bg)',   signo: '-' },
  ajuste:  { label: 'Ajuste',   icon: Settings2,    color: 'var(--amber)',       bg: 'var(--amber-bg)', signo: '±' },
}

const fmtPrecio = (n: number, m?: 'USD' | 'ARS') =>
  m === 'ARS' ? `$${Math.round(n).toLocaleString('es-AR')}` : `U$S ${n}`

export default function HistorialPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const { user } = useAuthStore()

  const [movimientos, setMovimientos] = useState<MovimientoStock[]>([])
  const [productos, setProductos] = useState<Producto2[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState<MovimientoTipo | 'todos'>('todos')
  const [showFormEntrada, setShowFormEntrada] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form entrada manual
  const [entProdId, setEntProdId] = useState('')
  const [entCantidad, setEntCantidad] = useState(1)
  const [entPrecio, setEntPrecio] = useState(0)
  const [entMoneda, setEntMoneda] = useState<'USD' | 'ARS'>('USD')
  const [entNota, setEntNota] = useState('')

  useEffect(() => { load() }, [workspaceId])

  const load = async () => {
    try {
      const [movs, prods] = await Promise.all([
        getMovimientos(workspaceId),
        getProductos2(workspaceId),
      ])
      setMovimientos(movs.sort((a, b) => toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime()))
      setProductos(prods)
    } finally { setLoading(false) }
  }

  const filtered = useMemo(() =>
    movimientos.filter(m => filtroTipo === 'todos' || m.tipo === filtroTipo),
    [movimientos, filtroTipo]
  )

  const handleEntrada = async () => {
    if (!entProdId || !entCantidad || !user) return
    setSaving(true)
    try {
      const prod = productos.find(p => p.id === entProdId)
      if (!prod) return
      // Registrar movimiento
      await registrarMovimiento(workspaceId, {
        workspaceId,
        productoId: entProdId,
        productoNombre: `${prod.marca} ${prod.modelo}${prod.storage ? ' ' + prod.storage : ''}${prod.color ? ' ' + prod.color : ''}`,
        tipo: 'entrada',
        cantidad: entCantidad,
        precioUnitario: entPrecio || undefined,
        moneda: entMoneda,
        nota: entNota || undefined,
        realizadoPor: user.uid,
      })
      // Actualizar stock
      await updateProducto2(workspaceId, entProdId, { stock: prod.stock + entCantidad })
      await load()
      setShowFormEntrada(false)
      setEntProdId(''); setEntCantidad(1); setEntPrecio(0); setEntNota('')
    } finally { setSaving(false) }
  }

  // Totales del día
  const hoy = new Date().toISOString().slice(0, 10)
  const movsHoy = movimientos.filter(m => toDate(m.createdAt).toISOString().slice(0, 10) === hoy)
  const ventasHoy = movsHoy.filter(m => m.tipo === 'venta').length
  const entradasHoy = movsHoy.filter(m => m.tipo === 'entrada').reduce((a, m) => a + m.cantidad, 0)

  if (loading) return (
    <div className="space-y-3 mt-2">
      {[1,2,3].map(i => <div key={i} className="h-14 rounded-2xl animate-pulse" style={{ background: 'var(--surface-2)' }} />)}
    </div>
  )

  return (
    <div className="space-y-4 animate-fade-in pb-4">

      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Historial</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            Hoy: {ventasHoy} ventas · {entradasHoy} unidades ingresadas
          </p>
        </div>
        <button onClick={() => setShowFormEntrada(true)} className="btn-primary gap-1 text-sm">
          <Plus size={15} /> Entrada
        </button>
      </div>

      {/* Resumen rápido */}
      <div className="grid grid-cols-4 gap-2">
        {(Object.keys(TIPO_CONFIG) as MovimientoTipo[]).map(tipo => {
          const cfg = TIPO_CONFIG[tipo]
          const count = movimientos.filter(m => m.tipo === tipo).length
          const Icon = cfg.icon
          return (
            <button key={tipo} onClick={() => setFiltroTipo(filtroTipo === tipo ? 'todos' : tipo)}
              className="flex flex-col items-center py-2.5 rounded-xl transition-all"
              style={{
                background: filtroTipo === tipo ? cfg.bg : 'var(--surface)',
                border: `1px solid ${filtroTipo === tipo ? cfg.color : 'var(--border)'}`,
              }}>
              <Icon size={16} style={{ color: cfg.color }} />
              <span className="text-lg font-bold mt-1" style={{ color: cfg.color }}>{count}</span>
              <span className="text-[9px] font-medium" style={{ color: 'var(--text-tertiary)' }}>{cfg.label}</span>
            </button>
          )
        })}
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Sin movimientos</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map(m => {
            const cfg = TIPO_CONFIG[m.tipo]
            const Icon = cfg.icon
            const fecha = toDate(m.createdAt)
            return (
              <div key={m.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: cfg.bg }}>
                  <Icon size={14} style={{ color: cfg.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {m.productoNombre}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                      style={{ background: cfg.bg, color: cfg.color }}>
                      {cfg.signo}{m.cantidad} u
                    </span>
                    {m.precioUnitario && (
                      <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                        {fmtPrecio(m.precioUnitario, m.moneda)}
                      </span>
                    )}
                    {m.nota && (
                      <span className="text-[10px] italic" style={{ color: 'var(--text-tertiary)' }}>
                        {m.nota}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                  {format(fecha, "d MMM HH:mm", { locale: es })}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal entrada manual */}
      {showFormEntrada && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowFormEntrada(false)}>
          <div className="w-full max-w-md rounded-2xl p-5 animate-slide-up"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Registrar entrada</h3>
              <button onClick={() => setShowFormEntrada(false)} className="btn-icon">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="label">Producto</label>
                <select className="input text-sm" value={entProdId}
                  onChange={e => setEntProdId(e.target.value)}>
                  <option value="">Seleccioná producto...</option>
                  {productos.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.marca} {p.modelo}{p.storage ? ' ' + p.storage : ''}{p.color ? ' ' + p.color : ''} (stock: {p.stock})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Cantidad</label>
                  <input type="number" min="1" className="input text-sm" value={entCantidad}
                    onChange={e => setEntCantidad(Number(e.target.value))} />
                </div>
                <div>
                  <label className="label">Precio costo</label>
                  <input type="number" className="input text-sm" placeholder="0 (opcional)"
                    value={entPrecio || ''} onChange={e => setEntPrecio(Number(e.target.value))} />
                </div>
              </div>

              <div>
                <label className="label">Moneda</label>
                <div className="flex gap-2">
                  {(['USD', 'ARS'] as const).map(m => (
                    <button key={m} onClick={() => setEntMoneda(m)}
                      className="flex-1 py-2 rounded-xl text-sm font-bold transition-all"
                      style={entMoneda === m
                        ? { background: 'var(--brand)', color: '#fff' }
                        : { background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Nota</label>
                <input className="input text-sm" placeholder="Ej: Compra mayorista, consignación..."
                  value={entNota} onChange={e => setEntNota(e.target.value)} />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={handleEntrada} disabled={!entProdId || !entCantidad || saving}
                className="btn-primary flex-1">
                {saving ? 'Guardando...' : 'Registrar entrada'}
              </button>
              <button onClick={() => setShowFormEntrada(false)} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
