'use client'
import { useModuloGuard } from '@/hooks/useModuloGuard'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Copy, Check } from 'lucide-react'
import {
  getStockiPhones, getStockOtrosApple, getStockAccesorios,
  getConfigIPhoneClub, getDolarConfig,
} from '@/lib/services'
import {
  generarBroadcastUsados,
  generarBroadcastNuevos,
  generarBroadcastOtrosApple,
  generarBroadcastAccesorios,
} from '@/lib/iphone-broadcast'
import type { StockIPhone, StockOtroApple, StockAccesorio, ConfigIPhoneClub, DolarConfig } from '@/types'

type Seccion = 'usados' | 'nuevos' | 'otros' | 'accesorios'

export default function BroadcastPage() {
  useModuloGuard('moduloBroadcast')
  const params = useParams()
  const workspaceId = params.workspaceId as string

  const [iphones, setIphones] = useState<StockIPhone[]>([])
  const [otros, setOtros] = useState<StockOtroApple[]>([])
  const [accesorios, setAccesorios] = useState<StockAccesorio[]>([])
  const [config, setConfig] = useState<ConfigIPhoneClub | null>(null)
  const [dolar, setDolar] = useState<DolarConfig | null>(null)
  const [loading, setLoading] = useState(true)

  const [secciones, setSecciones] = useState<Set<Seccion>>(new Set<Seccion>(['usados', 'nuevos']))
  const [copied, setCopied] = useState(false)

  useEffect(() => { load() }, [workspaceId])

  const load = async () => {
    try {
      const [iphonesData, otrosData, accesoriosData, configData, dolarData] = await Promise.all([
        getStockiPhones(workspaceId),
        getStockOtrosApple(workspaceId),
        getStockAccesorios(workspaceId),
        getConfigIPhoneClub(workspaceId),
        getDolarConfig(workspaceId),
      ])
      setIphones(iphonesData)
      setOtros(otrosData)
      setAccesorios(accesoriosData)
      setConfig(configData)
      setDolar(dolarData)
    } finally { setLoading(false) }
  }

  const toggleSeccion = (s: Seccion) => {
    setSecciones(prev => {
      const next = new Set(prev)
      if (next.has(s)) next.delete(s)
      else next.add(s)
      return next
    })
  }

  const mensaje = config ? (() => {
    const partes: string[] = []
    if (secciones.has('usados')) {
      const txt = generarBroadcastUsados(iphones, config)
      if (txt) partes.push(txt)
    }
    if (secciones.has('nuevos')) {
      const txt = generarBroadcastNuevos(iphones, config)
      if (txt) partes.push(txt)
    }
    if (secciones.has('otros')) {
      const txt = generarBroadcastOtrosApple(otros)
      if (txt) partes.push(txt)
    }
    if (secciones.has('accesorios')) {
      const txt = generarBroadcastAccesorios(accesorios)
      if (txt) partes.push(txt)
    }
    return partes.join('\n\n')
  })() : ''

  const copiar = () => {
    navigator.clipboard.writeText(mensaje)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const usadosCount     = iphones.filter(i => i.condicion === 'usado' && i.stock > 0).length
  const nuevosCount     = iphones.filter(i => i.condicion === 'nuevo' && i.stock > 0).length
  const otrosCount      = otros.filter(o => o.disponible && o.stock > 0).length
  const accesoriosCount = accesorios.filter(a => a.stock > 0).length

  if (loading) return (
    <div className="space-y-3 mt-2">
      {[1,2,3].map(i => <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: 'var(--surface-2)' }} />)}
    </div>
  )

  return (
    <div className="space-y-4 animate-fade-in pb-4">

      <div className="pt-1">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Broadcast</h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
          Generá el mensaje para WhatsApp desde tu stock
        </p>
      </div>

      {/* Selector de secciones */}
      <div className="card space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-tertiary)' }}>
          Incluir en el mensaje
        </p>
        {([
          { id: 'usados' as Seccion,  label: '🔥 Usados',      count: usadosCount },
          { id: 'nuevos' as Seccion,  label: '📦 Nuevos',      count: nuevosCount },
          { id: 'otros'       as Seccion, label: '⌚️ Otros Apple', count: otrosCount },
          { id: 'accesorios'  as Seccion, label: '🔌 Accesorios',   count: accesoriosCount },
        ]).map(({ id, label, count }) => (
          <button key={id} onClick={() => toggleSeccion(id)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all"
            style={secciones.has(id)
              ? { background: 'rgba(232,0,29,0.1)', border: '1px solid var(--brand)' }
              : { background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <span className="text-sm font-medium" style={{ color: secciones.has(id) ? 'var(--brand-light)' : 'var(--text-primary)' }}>
              {label}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{count} ítems</span>
              <div className="w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all"
                style={secciones.has(id)
                  ? { borderColor: 'var(--brand)', background: 'var(--brand)' }
                  : { borderColor: 'var(--border-strong)' }}>
                {secciones.has(id) && <Check size={11} className="text-white" />}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Preview del mensaje */}
      {mensaje ? (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
              Preview
            </p>
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {mensaje.length} caracteres
            </span>
          </div>
          <pre className="text-xs leading-relaxed whitespace-pre-wrap font-sans rounded-xl p-3 max-h-64 overflow-y-auto"
            style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
            {mensaje}
          </pre>
        </div>
      ) : (
        <div className="text-center py-8" style={{ color: 'var(--text-tertiary)' }}>
          <p className="text-sm">Seleccioná al menos una sección con stock disponible</p>
        </div>
      )}

      {/* Botón copiar */}
      <button onClick={copiar} disabled={!mensaje}
        className="w-full btn-primary py-3 gap-2 text-sm disabled:opacity-40">
        {copied ? <><Check size={16} /> ¡Copiado!</> : <><Copy size={16} /> Copiar mensaje</>}
      </button>
    </div>
  )
}
