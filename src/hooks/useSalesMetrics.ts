'use client'

import { useMemo } from 'react'
import { useSales } from './useSales'
import type { Sale } from '@/features/sales/types'

export interface VendedorMetrics {
  vendedorId:    string
  nombre:        string
  totalVentas:   number
  totalImporte:  number
  ticketPromedio: number
  ultimaVenta?:  Date
}

export interface ClienteMetrics {
  customerId:     string
  nombre:         string
  totalVentas:    number
  totalImporte:   number
  ticketPromedio: number
  ultimaVenta?:   Date
  productos:      string[]   // nombres de productos más comprados
}

export interface PeriodMetrics {
  label:        string
  ventas:       number
  importe:      number
}

export function useSalesMetrics(workspaceId: string) {
  const { sales, loading } = useSales(workspaceId, { limit: 500 })

  const metrics = useMemo(() => {
    if (!sales.length) return null

    const now     = new Date()
    const thisM   = now.getMonth()
    const thisY   = now.getFullYear()
    const lastM   = thisM === 0 ? 11 : thisM - 1
    const lastY   = thisM === 0 ? thisY - 1 : thisY

    const estesMes = sales.filter(s => {
      const d = s.fecha instanceof Date ? s.fecha : new Date()
      return d.getMonth() === thisM && d.getFullYear() === thisY
    })
    const mesPasado = sales.filter(s => {
      const d = s.fecha instanceof Date ? s.fecha : new Date()
      return d.getMonth() === lastM && d.getFullYear() === lastY
    })

    // ── Por vendedor ──────────────────────────────────────────────────────────
    const vendedorMap = new Map<string, VendedorMetrics>()
    for (const v of sales) {
      const vid   = v.vendedorId || '__sin__'
      const nombre = v.vendedorNombre || 'Sin asignar'
      if (!vendedorMap.has(vid)) {
        vendedorMap.set(vid, { vendedorId: vid, nombre, totalVentas: 0, totalImporte: 0, ticketPromedio: 0 })
      }
      const m = vendedorMap.get(vid)!
      m.totalVentas++
      m.totalImporte += v.total
      const fecha = v.fecha instanceof Date ? v.fecha : undefined
      if (!m.ultimaVenta || (fecha && fecha > m.ultimaVenta)) m.ultimaVenta = fecha
    }
    for (const m of Array.from(vendedorMap.values())) {
      m.ticketPromedio = m.totalVentas > 0 ? m.totalImporte / m.totalVentas : 0
    }
    const porVendedor = Array.from(vendedorMap.values())
      .sort((a, b) => b.totalImporte - a.totalImporte)

    // ── Por cliente ───────────────────────────────────────────────────────────
    const clienteMap = new Map<string, ClienteMetrics>()
    for (const v of sales) {
      if (!v.customerId) continue
      const cid = v.customerId
      if (!clienteMap.has(cid)) {
        clienteMap.set(cid, {
          customerId: cid, nombre: v.customerName,
          totalVentas: 0, totalImporte: 0, ticketPromedio: 0, productos: [],
        })
      }
      const m = clienteMap.get(cid)!
      m.totalVentas++
      m.totalImporte += v.total
      const fecha = v.fecha instanceof Date ? v.fecha : undefined
      if (!m.ultimaVenta || (fecha && fecha > m.ultimaVenta)) m.ultimaVenta = fecha
      for (const item of (v.items ?? [])) {
        if (!m.productos.includes(item.descripcion)) m.productos.push(item.descripcion)
      }
    }
    for (const m of Array.from(clienteMap.values())) {
      m.ticketPromedio = m.totalVentas > 0 ? m.totalImporte / m.totalVentas : 0
      m.productos = m.productos.slice(0, 3)  // top 3
    }
    const topClientes = Array.from(clienteMap.values())
      .sort((a, b) => b.totalImporte - a.totalImporte)
      .slice(0, 10)

    // ── Últimos 6 meses ───────────────────────────────────────────────────────
    const meses: PeriodMetrics[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(thisY, thisM - i, 1)
      const m = d.getMonth()
      const y = d.getFullYear()
      const label = d.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' })
      const ventasMes = sales.filter(s => {
        const sd = s.fecha instanceof Date ? s.fecha : new Date()
        return sd.getMonth() === m && sd.getFullYear() === y
      })
      meses.push({
        label,
        ventas:   ventasMes.length,
        importe:  ventasMes.reduce((s, v) => s + v.total, 0),
      })
    }

    return {
      total:          sales.length,
      totalImporte:   sales.reduce((s, v) => s + v.total, 0),
      estesMes:       estesMes.length,
      importeEstesMes: estesMes.reduce((s, v) => s + v.total, 0),
      mesPasado:      mesPasado.length,
      importeMesPasado: mesPasado.reduce((s, v) => s + v.total, 0),
      ticketPromedio: sales.length > 0 ? sales.reduce((s, v) => s + v.total, 0) / sales.length : 0,
      porVendedor,
      topClientes,
      ultimos6Meses:  meses,
    }
  }, [sales])

  return { metrics, loading }
}
