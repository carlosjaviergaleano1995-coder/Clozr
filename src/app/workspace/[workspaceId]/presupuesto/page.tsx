'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { FileText, Copy, Share2, Plus, Trash2 } from 'lucide-react'
import { getProductos, getClientes } from '@/lib/services'
import { useWorkspaceStore } from '@/store'
import type { Producto, Cliente } from '@/types'

interface LineItem { producto: Producto | null; cantidad: number; precioTipo: 'final' | 'revendedor' | 'mayorista' }

export default function PresupuestoPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const { getActiveWorkspace } = useWorkspaceStore()
  const ws = getActiveWorkspace()

  const [productos, setProductos] = useState<Producto[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)

  const [clienteId, setClienteId] = useState('')
  const [clienteNombre, setClienteNombre] = useState('')
  const [items, setItems] = useState<LineItem[]>([{ producto: null, cantidad: 1, precioTipo: 'final' }])
  const [notas, setNotas] = useState('')
  const [msgCopiado, setMsgCopiado] = useState(false)

  useEffect(() => { load() }, [workspaceId])

  const load = async () => {
    try {
      const [p, c] = await Promise.all([getProductos(workspaceId), getClientes(workspaceId)])
      setProductos(p)
      setClientes(c)
    } finally { setLoading(false) }
  }

  const clienteSeleccionado = clientes.find(c => c.id === clienteId)
  const tipoPrecioDefault = clienteSeleccionado?.tipo === 'revendedor' ? 'revendedor'
    : clienteSeleccionado?.tipo === 'mayorista' ? 'mayorista' : 'final'

  const addItem = () => setItems(prev => [...prev, { producto: null, cantidad: 1, precioTipo: tipoPrecioDefault }])
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i))

  const setItemProducto = (i: number, prodId: string) => {
    const prod = productos.find(p => p.id === prodId) ?? null
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, producto: prod } : item))
  }

  const getPrecio = (item: LineItem): number => {
    if (!item.producto) return 0
    const p = item.producto
    if (item.precioTipo === 'revendedor') return p.precioRevendedor ?? p.precioFinal ?? 0
    if (item.precioTipo === 'mayorista') return p.precioMayorista ?? p.precioRevendedor ?? p.precioFinal ?? 0
    return p.precioFinal ?? 0
  }

  const fmt = (n: number, moneda = 'USD') =>
    moneda === 'USD' ? `U$S ${n.toLocaleString('es-AR')}` : `$${Math.round(n).toLocaleString('es-AR')}`

  const total = items.reduce((acc, item) => acc + getPrecio(item) * item.cantidad, 0)
  const monedaPredom = items[0]?.producto?.moneda ?? 'USD'

  const generarMensaje = () => {
    const nombre = clienteSeleccionado?.nombre ?? clienteNombre ?? 'Cliente'
    let msg = `Hola ${nombre}! 👋 Te paso el presupuesto:\n\n`
    items.filter(i => i.producto).forEach(item => {
      const p = item.producto!
      const precio = getPrecio(item)
      const nombre = [p.nombre, p.storage, p.color, p.condicion === 'usado' && p.bateria ? `${p.bateria}%` : null].filter(Boolean).join(' ')
      msg += `▸ ${item.cantidad}x ${nombre} → ${fmt(precio, p.moneda)}\n`
    })
    msg += `\n*Total: ${fmt(total, monedaPredom)}*`
    if (notas) msg += `\n\n${notas}`
    return msg
  }

  const copiarMensaje = () => {
    navigator.clipboard.writeText(generarMensaje())
    setMsgCopiado(true)
    setTimeout(() => setMsgCopiado(false), 2000)
  }

  const compartirWA = () => {
    const tel = clienteSeleccionado?.telefono?.replace(/\D/g, '')
    const msg = encodeURIComponent(generarMensaje())
    window.open(tel ? `https://wa.me/54${tel}?text=${msg}` : `https://wa.me/?text=${msg}`, '_blank')
  }

  if (loading) return (
    <div className="space-y-3 mt-2">
      {[1,2,3].map(i => <div key={i} className="h-20 bg-surface-200 rounded-2xl animate-pulse" />)}
    </div>
  )

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="pt-1">
        <h2 className="text-lg font-semibold text-surface-900">Cotización rápida</h2>
        <p className="text-surface-500 text-xs mt-0.5">Armá un presupuesto y envialo por WhatsApp</p>
      </div>

      {/* Cliente */}
      <div className="card">
        <p className="text-sm font-semibold text-surface-700 mb-3">Cliente</p>
        {clientes.length > 0 ? (
          <select className="input" value={clienteId} onChange={e => setClienteId(e.target.value)}>
            <option value="">Seleccioná un cliente...</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre} ({c.tipo})</option>)}
          </select>
        ) : (
          <input className="input" placeholder="Nombre del cliente" value={clienteNombre}
            onChange={e => setClienteNombre(e.target.value)} />
        )}
        {clienteSeleccionado && (
          <div className="mt-2 p-2 bg-surface-50 rounded-xl">
            <p className="text-xs text-surface-500">
              {clienteSeleccionado.tipo} · Precio sugerido: <strong>{tipoPrecioDefault}</strong>
              {clienteSeleccionado.telefono && ` · ${clienteSeleccionado.telefono}`}
            </p>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="card">
        <p className="text-sm font-semibold text-surface-700 mb-3">Productos</p>
        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={i} className="space-y-2 pb-3 border-b border-surface-100 last:border-0 last:pb-0">
              <div className="flex gap-2">
                <select className="input flex-1" value={item.producto?.id ?? ''}
                  onChange={e => setItemProducto(i, e.target.value)}>
                  <option value="">Seleccioná producto...</option>
                  {productos.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} {p.storage ? p.storage : ''} {p.color ? p.color : ''} {p.condicion === 'usado' && p.bateria ? `${p.bateria}%` : ''}
                    </option>
                  ))}
                </select>
                <input type="number" min="1" className="input w-16 text-center" value={item.cantidad}
                  onChange={e => setItems(prev => prev.map((it, idx) => idx === i ? {...it, cantidad: Number(e.target.value) || 1} : it))} />
                {items.length > 1 && (
                  <button onClick={() => removeItem(i)} className="btn-icon text-red-400 hover:bg-red-50 flex-shrink-0">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
              {item.producto && (
                <div className="flex items-center gap-2">
                  <div className="flex gap-1 flex-wrap">
                    {(['final', 'revendedor', 'mayorista'] as const).map(tipo => {
                      const precio = tipo === 'final' ? item.producto!.precioFinal
                        : tipo === 'revendedor' ? item.producto!.precioRevendedor
                        : item.producto!.precioMayorista
                      if (!precio) return null
                      return (
                        <button key={tipo}
                          onClick={() => setItems(prev => prev.map((it, idx) => idx === i ? {...it, precioTipo: tipo} : it))}
                          className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${item.precioTipo === tipo ? 'bg-surface-900 text-white' : 'bg-surface-100 text-surface-600'}`}>
                          {tipo}: {fmt(precio, item.producto!.moneda)}
                        </button>
                      )
                    })}
                  </div>
                  <span className="ml-auto text-sm font-bold text-brand-600">
                    {fmt(getPrecio(item) * item.cantidad, item.producto.moneda)}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
        <button onClick={addItem} className="btn-ghost w-full mt-3 text-sm">
          <Plus size={15} /> Agregar producto
        </button>
      </div>

      {/* Notas */}
      <div className="card">
        <label className="label">Condiciones / Notas</label>
        <textarea className="input resize-none" rows={3}
          placeholder="Entrega inmediata · Garantía oficial · USDT -0.5%..."
          value={notas} onChange={e => setNotas(e.target.value)} />
      </div>

      {/* Total */}
      {total > 0 && (
        <div className="card bg-surface-900 border-surface-800">
          <div className="flex items-center justify-between">
            <span className="text-surface-300 text-sm font-medium">Total</span>
            <span className="text-white text-xl font-bold">{fmt(total, monedaPredom)}</span>
          </div>
        </div>
      )}

      {/* Acciones */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={copiarMensaje} disabled={total === 0}
          className="btn-secondary flex items-center justify-center gap-2 py-3 disabled:opacity-40">
          <Copy size={16} /> {msgCopiado ? '✅ Copiado' : 'Copiar'}
        </button>
        <button onClick={compartirWA} disabled={total === 0}
          className="btn-primary flex items-center justify-center gap-2 py-3 disabled:opacity-40">
          <Share2 size={16} /> Enviar WA
        </button>
      </div>
    </div>
  )
}
