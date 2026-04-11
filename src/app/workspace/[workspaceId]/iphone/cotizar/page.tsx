'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { Copy, Check, Search } from 'lucide-react'
import {
  getStockiPhones, getStockOtrosApple,
  getConfigIPhoneClub, getDolarConfig,
} from '@/lib/services'
import { aplicarFormaPago } from '@/lib/iphone-broadcast'
import type { StockIPhone, StockOtroApple, ConfigIPhoneClub, DolarConfig, FormaPagoIC } from '@/types'

type TipoCliente = 'mayorista' | 'revendedor' | 'final'

const FORMAS_PAGO: { id: FormaPagoIC | 'usd_efectivo'; label: string }[] = [
  { id: 'usd_efectivo',      label: '💵 USD Efectivo' },
  { id: 'usdt',              label: '🔵 USDT' },
  { id: 'transferencia_ars', label: '🏦 Transferencia ARS' },
  { id: 'manchados',         label: '🟡 Manchados' },
]

const fmtUSD = (n: number) => `U$S ${n.toLocaleString('es-AR', { maximumFractionDigits: 1 })}`
const fmtARS = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`

export default function CotizarPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string

  const [iphones, setIphones] = useState<StockIPhone[]>([])
  const [otros, setOtros] = useState<StockOtroApple[]>([])
  const [config, setConfig] = useState<ConfigIPhoneClub | null>(null)
  const [dolar, setDolar] = useState<DolarConfig | null>(null)
  const [loading, setLoading] = useState(true)

  const [tipoCliente, setTipoCliente] = useState<TipoCliente>('revendedor')
  const [formaPago, setFormaPago] = useState<FormaPagoIC | 'usd_efectivo'>('usd_efectivo')
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => { load() }, [workspaceId])

  const load = async () => {
    try {
      const [iphonesData, otrosData, configData, dolarData] = await Promise.all([
        getStockiPhones(workspaceId),
        getStockOtrosApple(workspaceId),
        getConfigIPhoneClub(workspaceId),
        getDolarConfig(workspaceId),
      ])
      setIphones(iphonesData)
      setOtros(otrosData)
      setConfig(configData)
      setDolar(dolarData)
    } finally { setLoading(false) }
  }

  const getPrecioBase = (precioUSD: number): number => {
    if (!config) return precioUSD
    if (tipoCliente === 'final') return precioUSD + config.margenFinal
    return precioUSD // mayorista y revendedor al mismo precio base
  }

  const getPrecioMostrar = (precioBase: number) => {
    if (!config || !dolar) return { precio: precioBase, moneda: 'USD' as const, label: 'USD' }
    return aplicarFormaPago(precioBase, dolar.valor, formaPago, config)
  }

  const todosItems = useMemo(() => {
    const busq = search.toLowerCase()
    const iphonesFiltrados = iphones
      .filter(i => i.stock > 0)
      .filter(i => !busq || `${i.modelo} ${i.color} ${i.storage}`.toLowerCase().includes(busq))
    const otrosFiltrados = otros
      .filter(o => o.stock > 0 && o.disponible)
      .filter(o => !busq || o.modelo.toLowerCase().includes(busq))
    return { iphones: iphonesFiltrados, otros: otrosFiltrados }
  }, [iphones, otros, search])

  const copiarPrecio = (item: StockIPhone | StockOtroApple, tipo: 'iphone' | 'otro') => {
    if (!config || !dolar) return
    const precioBase = tipo === 'iphone'
      ? getPrecioBase((item as StockIPhone).precioUSD)
      : getPrecioBase((item as StockOtroApple).precioUSD)
    const { precio, moneda, label } = getPrecioMostrar(precioBase)

    let texto = ''
    if (tipo === 'iphone') {
      const i = item as StockIPhone
      texto = `${i.modelo} ${i.storage} ${i.color}`
      if (i.condicion === 'usado' && i.bateria) texto += ` ${i.bateria}%`
      if (i.observaciones) texto += ` (${i.observaciones})`
    } else {
      const o = item as StockOtroApple
      texto = o.modelo
      if (o.descripcion) texto += ` (${o.descripcion})`
    }

    const precioFmt = moneda === 'ARS' ? fmtARS(precio) : fmtUSD(precio)
    navigator.clipboard.writeText(`${texto} → ${precioFmt}`)
    setCopied(item.id)
    setTimeout(() => setCopied(null), 2000)
  }

  if (loading) return (
    <div className="space-y-3 mt-2">
      {[1,2,3].map(i => <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: 'var(--surface-2)' }} />)}
    </div>
  )

  return (
    <div className="space-y-4 animate-fade-in pb-4">

      <div className="pt-1">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Cotizar</h2>
        {dolar && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            Dólar blue: {fmtARS(dolar.valor)}
          </p>
        )}
      </div>

      {/* Tipo de cliente */}
      <div className="card space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-tertiary)' }}>
            Tipo de cliente
          </p>
          <div className="grid grid-cols-3 gap-2">
            {([
              { id: 'mayorista'  as TipoCliente, label: 'Mayorista' },
              { id: 'revendedor' as TipoCliente, label: 'Revendedor' },
              { id: 'final'      as TipoCliente, label: 'Final' },
            ]).map(({ id, label }) => (
              <button key={id} onClick={() => setTipoCliente(id)}
                className="py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={tipoCliente === id
                  ? { background: 'var(--brand)', color: '#fff' }
                  : { background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                {label}
                {id === 'final' && config && (
                  <span className="block text-[9px] font-normal opacity-70">+U$S {config.margenFinal}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Forma de pago */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-tertiary)' }}>
            Forma de pago
          </p>
          <div className="grid grid-cols-2 gap-2">
            {FORMAS_PAGO.map(({ id, label }) => (
              <button key={id} onClick={() => setFormaPago(id)}
                className="py-2 rounded-xl text-xs font-medium transition-all"
                style={formaPago === id
                  ? { background: 'var(--surface-3)', color: 'var(--text-primary)', border: '1px solid var(--brand)' }
                  : { background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                {label}
                {id !== 'usd_efectivo' && config && (() => {
                  const mod = id === 'usdt' ? config.formasPago.usdt
                    : id === 'transferencia_ars' ? config.formasPago.transferencia_ars
                    : config.formasPago.manchados
                  return (
                    <span className="block text-[9px] opacity-60">
                      {mod > 0 ? `+${mod}%` : `${mod}%`}
                    </span>
                  )
                })()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
        <input className="input pl-8 text-sm" placeholder="Buscar modelo..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* iPhones */}
      {todosItems.iphones.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2 px-1"
            style={{ color: 'var(--text-tertiary)' }}>📱 iPhones</p>
          <div className="space-y-2">
            {todosItems.iphones.map(item => {
              const precioBase = getPrecioBase(item.precioUSD)
              const { precio, moneda } = getPrecioMostrar(precioBase)
              const precioFmt = moneda === 'ARS' ? fmtARS(precio) : fmtUSD(precio)

              return (
                <div key={item.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {item.modelo}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {item.color} · {item.storage}
                      </span>
                      {item.condicion === 'usado' && item.bateria && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                          style={{
                            background: item.bateria >= 85 ? 'var(--green-bg)' : item.bateria >= 75 ? 'var(--amber-bg)' : 'var(--red-bg)',
                            color: item.bateria >= 85 ? 'var(--green)' : item.bateria >= 75 ? 'var(--amber)' : 'var(--brand-light)',
                          }}>
                          {item.bateria}%
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--brand-light)' }}>
                      {precioFmt}
                      {moneda === 'ARS' && dolar && (
                        <span className="text-xs font-normal ml-1" style={{ color: 'var(--text-tertiary)' }}>
                          ({fmtUSD(precioBase)})
                        </span>
                      )}
                    </p>
                  </div>
                  <button onClick={() => copiarPrecio(item, 'iphone')}
                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
                    style={copied === item.id
                      ? { background: 'var(--green-bg)', color: 'var(--green)' }
                      : { background: 'var(--surface-2)', color: 'var(--text-tertiary)' }}>
                    {copied === item.id ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Otros Apple */}
      {todosItems.otros.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2 px-1"
            style={{ color: 'var(--text-tertiary)' }}>⌚️ Otros Apple</p>
          <div className="space-y-2">
            {todosItems.otros.map(item => {
              const precioBase = getPrecioBase(item.precioUSD)
              const { precio, moneda } = getPrecioMostrar(precioBase)
              const precioFmt = moneda === 'ARS' ? fmtARS(precio) : fmtUSD(precio)

              return (
                <div key={item.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {item.modelo}
                    </p>
                    {item.descripcion && (
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{item.descripcion}</p>
                    )}
                    <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--brand-light)' }}>
                      {precioFmt}
                    </p>
                  </div>
                  <button onClick={() => copiarPrecio(item, 'otro')}
                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
                    style={copied === item.id
                      ? { background: 'var(--green-bg)', color: 'var(--green)' }
                      : { background: 'var(--surface-2)', color: 'var(--text-tertiary)' }}>
                    {copied === item.id ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {todosItems.iphones.length === 0 && todosItems.otros.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Sin stock disponible</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
            Cargá iPhones u otros productos en Stock
          </p>
        </div>
      )}
    </div>
  )
}
