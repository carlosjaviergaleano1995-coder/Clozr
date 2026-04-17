'use client'
import { useModuloGuard } from '@/hooks/useModuloGuard'
import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { Copy, Check, RefreshCw } from 'lucide-react'
import { getProductos2, getConfigIPhoneClub, getDolarConfig, fetchDolarBlue, saveDolarConfig } from '@/lib/services'
import type { Producto2, ConfigIPhoneClub, DolarConfig } from '@/types'
import { fmtARS, fmtUSD } from '@/lib/format'

type Seccion = 'smartphones_usados' | 'smartphones_nuevos' | 'otros' | 'accesorios'

const SECCION_LABEL: Record<Seccion, string> = {
  smartphones_usados: '📱 iPhones usados',
  smartphones_nuevos: '📦 iPhones nuevos',
  otros:              '💻 Otros Apple',
  accesorios:        '🔌 Accesorios',
}

export default function BroadcastPage() {
  useModuloGuard('moduloBroadcast')
  const params = useParams()
  const workspaceId = params.workspaceId as string

  const [productos, setProductos] = useState<Producto2[]>([])
  const [config, setConfig] = useState<ConfigIPhoneClub | null>(null)
  const [dolar, setDolar] = useState<DolarConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [secciones, setSecciones] = useState<Set<Seccion>>(new Set<Seccion>(['smartphones_usados', 'smartphones_nuevos']))
  const [copied, setCopied] = useState(false)

  const [actualizando, setActualizando] = useState(false)

  useEffect(() => { load() }, [workspaceId])

  const load = async () => {
    try {
      const [prods, cfg, dolarData] = await Promise.all([
        getProductos2(workspaceId),
        getConfigIPhoneClub(workspaceId),
        getDolarConfig(workspaceId),
      ])
      setProductos(prods.filter(p => p.stock > 0))
      setConfig(cfg)
      // Auto-actualizar dólar si el valor guardado tiene más de 1 hora
      const guardado = dolarData?.valor ?? 0
      const hace = dolarData?.actualizadoAt
        ? Date.now() - new Date(dolarData.actualizadoAt as any).getTime()
        : Infinity
      if (!guardado || hace > 3600000) {
        const nuevo = await fetchDolarBlue()
        if (nuevo) {
          const nuevoConfig = { valor: nuevo, actualizadoAt: new Date(), modoManual: false }
          await saveDolarConfig(workspaceId, nuevoConfig)
          setDolar(nuevoConfig)
        } else {
          setDolar(dolarData)
        }
      } else {
        setDolar(dolarData)
      }
    } finally { setLoading(false) }
  }

  const actualizarDolar = async () => {
    setActualizando(true)
    try {
      const nuevo = await fetchDolarBlue()
      if (nuevo) {
        const nuevoConfig = { valor: nuevo, actualizadoAt: new Date(), modoManual: false }
        await saveDolarConfig(workspaceId, nuevoConfig)
        setDolar(nuevoConfig)
      }
    } finally { setActualizando(false) }
  }

  const toggleSeccion = (s: Seccion) => {
    setSecciones(prev => {
      const arr = Array.from(prev)
      return new Set(prev.has(s) ? arr.filter(x => x !== s) : [...arr, s])
    })
  }

  const dolarValor = dolar?.valor ?? 1200
  const margen = config?.margenFinal ?? 20

  // Precio final en ARS
  const precioFinalARS = (p: Producto2) => {
    const base = p.moneda === 'USD' ? (p.precioUSD + margen) * dolarValor : p.precioUSD
    return fmtARS(base)
  }

  const precioBaseStr = (p: Producto2) =>
    p.moneda === 'USD' ? fmtUSD(p.precioUSD) : fmtARS(p.precioUSD)

  // Generar línea por producto
  const lineaProducto = (p: Producto2): string => {
    const nombre = `${p.marca} ${p.modelo}${p.storage ? ' ' + p.storage : ''}${p.color ? ' ' + p.color : ''}`
    const bateria = p.smartphone?.bateria ? ` 🔋${p.smartphone.bateria}%` : ''
    const precio = precioFinalARS(p)
    return `▸ ${nombre}${bateria} → ${precio}`
  }

  const broadcast = useMemo(() => {
    let txt = ''
    const pie = config?.pieTextoUsados ?? ''

    if (secciones.has('smartphones_usados')) {
      const items = productos.filter(p => p.categoria === 'smartphones' && p.condicion === 'usado')
      if (items.length > 0) {
        txt += '*📱 USADOS*\n'
        items.forEach(p => { txt += lineaProducto(p) + '\n' })
        txt += '\n'
      }
    }
    if (secciones.has('smartphones_nuevos')) {
      const items = productos.filter(p => p.categoria === 'smartphones' && p.condicion === 'nuevo')
      if (items.length > 0) {
        txt += '*📦 NUEVOS*\n'
        items.forEach(p => { txt += lineaProducto(p) + '\n' })
        txt += '\n'
      }
    }
    if (secciones.has('otros')) {
      const items = productos.filter(p => ['computadoras','tablets','wearables','gaming','audio'].includes(p.categoria))
      if (items.length > 0) {
        txt += '*💻 OTROS*\n'
        items.forEach(p => { txt += lineaProducto(p) + '\n' })
        txt += '\n'
      }
    }
    if (secciones.has('accesorios')) {
      const items = productos.filter(p => p.categoria === 'accesorios')
      if (items.length > 0) {
        txt += '*🔌 ACCESORIOS*\n'
        items.forEach(p => { txt += lineaProducto(p) + '\n' })
        txt += '\n'
      }
    }

    if (txt && pie) txt += pie
    return txt.trim()
  }, [productos, secciones, dolarValor, margen])

  const copiar = () => {
    navigator.clipboard.writeText(broadcast)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Conteos por sección
  const counts: Record<Seccion, number> = {
    smartphones_usados: productos.filter(p => p.categoria === 'smartphones' && p.condicion === 'usado').length,
    smartphones_nuevos: productos.filter(p => p.categoria === 'smartphones' && p.condicion === 'nuevo').length,
    otros:              productos.filter(p => ['computadoras','tablets','wearables','gaming','audio'].includes(p.categoria)).length,
    accesorios:        productos.filter(p => p.categoria === 'accesorios').length,
  }

  if (loading) return (
    <div className="space-y-3 mt-2">
      {[1,2,3].map(i => <div key={i} className="h-14 rounded-2xl animate-pulse" style={{ background: 'var(--surface-2)' }} />)}
    </div>
  )

  return (
    <div className="space-y-4 animate-fade-in pb-4">

      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Broadcast</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            Dólar blue: {fmtARS(dolarValor)} · Margen: U$S {margen}
          </p>
        </div>
        <button onClick={actualizarDolar} disabled={actualizando}
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: actualizando ? 'var(--green-bg)' : 'var(--surface-2)', color: actualizando ? 'var(--green)' : 'var(--text-tertiary)' }}>
          <RefreshCw size={15} className={actualizando ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Secciones */}
      <div className="grid grid-cols-2 gap-2">
        {(Object.entries(SECCION_LABEL) as [Seccion, string][]).map(([s, label]) => (
          <button key={s} onClick={() => toggleSeccion(s)}
            className="flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-left"
            style={secciones.has(s)
              ? { background: 'rgba(232,0,29,0.08)', border: '1.5px solid var(--brand)' }
              : { background: 'var(--surface)', border: '1.5px solid var(--border)' }}>
            <span className="text-xs font-medium" style={{ color: secciones.has(s) ? 'var(--brand-light)' : 'var(--text-secondary)' }}>
              {label}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full"
              style={{ background: 'var(--surface-2)', color: 'var(--text-tertiary)' }}>
              {counts[s]}
            </span>
          </button>
        ))}
      </div>

      {/* Preview y copiar */}
      {broadcast ? (
        <>
          <button onClick={copiar}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm transition-all"
            style={copied
              ? { background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid var(--green)' }
              : { background: 'var(--brand)', color: '#fff' }}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copiado ✓' : 'Copiar lista de precios'}
          </button>
          <div className="px-4 py-3 rounded-2xl whitespace-pre-wrap text-xs"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            {broadcast}
          </div>
        </>
      ) : (
        <div className="text-center py-10">
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Sin productos para las secciones seleccionadas</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
            Agregá productos al inventario o activá más secciones
          </p>
        </div>
      )}
    </div>
  )
}
