'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { getVentasIPhone, getDolarConfig, getStockiPhones } from '@/lib/services'
import type { VentaIPhone, StockIPhone } from '@/types'
import { fmtARS, fmtUSD } from '@/lib/format'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const toDate = (v: any): Date => {
  if (!v) return new Date()
  if (v instanceof Date) return v
  if (v?.seconds) return new Date(v.seconds * 1000)
  return new Date(v)
}

// Últimos N meses
function ultimos6Meses(): { key: string; label: string }[] {
  const meses = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    meses.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: format(d, 'MMM', { locale: es }),
    })
  }
  return meses
}

export default function ResumenIPhonePage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string

  const [ventas, setVentas] = useState<VentaIPhone[]>([])
  const [stock, setStock] = useState<StockIPhone[]>([])
  const [dolarValor, setDolarValor] = useState(1200)
  const [loading, setLoading] = useState(true)
  const [periodoMeses, setPeriodoMeses] = useState(1) // 1 = este mes, 3 = últimos 3, 0 = todo

  useEffect(() => { load() }, [workspaceId])

  const load = async () => {
    try {
      const [v, s, d] = await Promise.all([
        getVentasIPhone(workspaceId),
        getStockiPhones(workspaceId),
        getDolarConfig(workspaceId),
      ])
      setVentas(v)
      setStock(s)
      setDolarValor(d?.valor ?? 1200)
    } finally { setLoading(false) }
  }

  // Filtrar ventas según periodo
  const ventasFiltradas = useMemo(() => {
    if (periodoMeses === 0) return ventas
    const cutoff = new Date()
    cutoff.setMonth(cutoff.getMonth() - periodoMeses)
    return ventas.filter(v => toDate(v.fecha) >= cutoff)
  }, [ventas, periodoMeses])

  // Métricas generales
  const totalVentas = ventasFiltradas.length
  const gananciaTotal = ventasFiltradas.reduce((s, v) => s + v.gananciaUSD, 0)
  const facturadoTotal = ventasFiltradas.reduce((s, v) => s + v.precioVentaUSD, 0)
  const ticketPromedio = totalVentas > 0 ? facturadoTotal / totalVentas : 0
  const margenPromedio = facturadoTotal > 0 ? (gananciaTotal / facturadoTotal) * 100 : 0

  // Por forma de pago
  const porFormaPago = useMemo(() => {
    const map: Record<string, { cant: number; ganancia: number }> = {}
    ventasFiltradas.forEach(v => {
      if (!map[v.formaPago]) map[v.formaPago] = { cant: 0, ganancia: 0 }
      map[v.formaPago].cant++
      map[v.formaPago].ganancia += v.gananciaUSD
    })
    return Object.entries(map).sort((a, b) => b[1].cant - a[1].cant)
  }, [ventasFiltradas])

  const FORMA_LABEL: Record<string, string> = {
    usd_efectivo: '💵 USD Efectivo',
    usdt: '🔵 USDT',
    transferencia_ars: '🏦 Transferencia',
    manchados: '🟡 Manchados',
  }

  // Top modelos vendidos
  const topModelos = useMemo(() => {
    const map: Record<string, { cant: number; ganancia: number }> = {}
    ventasFiltradas.forEach(v => {
      const modelo = v.descripcion.split(' ').slice(0, 3).join(' ')
      if (!map[modelo]) map[modelo] = { cant: 0, ganancia: 0 }
      map[modelo].cant++
      map[modelo].ganancia += v.gananciaUSD
    })
    return Object.entries(map)
      .sort((a, b) => b[1].cant - a[1].cant)
      .slice(0, 5)
  }, [ventasFiltradas])

  // Evolución mensual (últimos 6 meses)
  const meses6 = ultimos6Meses()
  const evolucion = useMemo(() => {
    return meses6.map(({ key, label }) => {
      const [year, month] = key.split('-').map(Number)
      const items = ventas.filter(v => {
        const f = toDate(v.fecha)
        return f.getFullYear() === year && f.getMonth() + 1 === month
      })
      return {
        label,
        cant: items.length,
        ganancia: items.reduce((s, v) => s + v.gananciaUSD, 0),
      }
    })
  }, [ventas])

  const maxGanancia = Math.max(...evolucion.map(e => e.ganancia), 1)

  // Stock disponible
  const stockUsados  = stock.filter(s => s.condicion === 'usado'  && s.stock > 0)
  const stockNuevos  = stock.filter(s => s.condicion === 'nuevo'  && s.stock > 0)
  const valorStockUSD = stock.filter(s => s.stock > 0).reduce((s, i) => s + i.precioUSD * i.stock, 0)

  if (loading) return (
    <div className="space-y-3 mt-2">
      {[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--surface-2)' }} />)}
    </div>
  )

  return (
    <div className="space-y-4 animate-fade-in pb-4">

      {/* Header + periodo */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Resumen</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>iPhone Club</p>
        </div>
        <div className="flex gap-1">
          {[
            { v: 1, l: 'Mes' },
            { v: 3, l: '3M' },
            { v: 0, l: 'Todo' },
          ].map(({ v, l }) => (
            <button key={v} onClick={() => setPeriodoMeses(v)}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
              style={periodoMeses === v
                ? { background: 'var(--brand)', color: '#fff' }
                : { background: 'var(--surface-2)', color: 'var(--text-tertiary)', border: '1px solid var(--border)' }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-2 gap-2">
        <div className="card">
          <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: 'var(--text-tertiary)' }}>Ganancia</p>
          <p className="text-xl font-bold" style={{ color: 'var(--green)' }}>{fmtUSD(gananciaTotal)}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{fmtARS(gananciaTotal * dolarValor)}</p>
        </div>
        <div className="card">
          <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: 'var(--text-tertiary)' }}>Facturado</p>
          <p className="text-xl font-bold" style={{ color: 'var(--brand-light)' }}>{fmtUSD(facturadoTotal)}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{totalVentas} ventas</p>
        </div>
        <div className="card">
          <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: 'var(--text-tertiary)' }}>Ticket promedio</p>
          <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{fmtUSD(ticketPromedio)}</p>
        </div>
        <div className="card">
          <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: 'var(--text-tertiary)' }}>Margen promedio</p>
          <p className="text-lg font-bold" style={{ color: 'var(--amber)' }}>{margenPromedio.toFixed(1)}%</p>
        </div>
      </div>

      {/* Evolución mensual — gráfico de barras simple */}
      <div className="card">
        <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-tertiary)' }}>
          Ganancia últimos 6 meses
        </p>
        <div className="flex items-end gap-1.5 h-20">
          {evolucion.map(({ label, ganancia }) => (
            <div key={label} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full rounded-t-md transition-all"
                style={{
                  height: `${(ganancia / maxGanancia) * 64}px`,
                  minHeight: ganancia > 0 ? '4px' : '0',
                  background: ganancia > 0 ? 'var(--brand)' : 'var(--surface-3)',
                }} />
              <span className="text-[9px] capitalize" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2">
          {evolucion.map(({ label, ganancia, cant }) => (
            <div key={label} className="flex-1 text-center">
              {ganancia > 0 && (
                <p className="text-[8px] font-semibold" style={{ color: 'var(--green)' }}>
                  +{fmtUSD(ganancia).replace('USD ', '')}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Top modelos */}
      {topModelos.length > 0 && (
        <div className="card">
          <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-tertiary)' }}>
            Top modelos vendidos
          </p>
          <div className="space-y-2">
            {topModelos.map(([modelo, { cant, ganancia }]) => (
              <div key={modelo} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{modelo}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="h-1.5 rounded-full flex-1"
                      style={{ background: 'var(--surface-3)' }}>
                      <div className="h-full rounded-full"
                        style={{
                          width: `${(cant / topModelos[0][1].cant) * 100}%`,
                          background: 'var(--brand)',
                        }} />
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{cant}u</p>
                  <p className="text-[10px]" style={{ color: 'var(--green)' }}>+{fmtUSD(ganancia)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Por forma de pago */}
      {porFormaPago.length > 0 && (
        <div className="card">
          <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-tertiary)' }}>
            Por forma de pago
          </p>
          <div className="space-y-2">
            {porFormaPago.map(([forma, { cant, ganancia }]) => (
              <div key={forma} className="flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {FORMA_LABEL[forma] ?? forma}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {cant} {cant === 1 ? 'venta' : 'ventas'}
                  </span>
                  <span className="text-xs font-semibold" style={{ color: 'var(--green)' }}>
                    +{fmtUSD(ganancia)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stock disponible */}
      <div className="card">
        <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-tertiary)' }}>
          Stock actual
        </p>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{stockUsados.length}</p>
            <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Usados</p>
          </div>
          <div>
            <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{stockNuevos.length}</p>
            <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Nuevos</p>
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--amber)' }}>{fmtUSD(valorStockUSD)}</p>
            <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Valor costo</p>
          </div>
        </div>
      </div>

      {ventas.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            Registrá ventas para ver el resumen financiero
          </p>
        </div>
      )}
    </div>
  )
}
