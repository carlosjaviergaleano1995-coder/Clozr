'use client'

import { useState, useEffect } from 'react'
import { collection, query, orderBy, limit, where, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Sale } from '@/features/sales/types'
import { adaptVentaDoc } from '@/features/sales/adapters'

interface UseSalesOptions {
  customerId?: string
  limit?:      number
}

export function useSales(workspaceId: string, options: UseSalesOptions = {}) {
  const [sales,   setSales]   = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!workspaceId) { setLoading(false); return }

    let q = query(
      collection(db, `workspaces/${workspaceId}/ventas`),
      orderBy('createdAt', 'desc'),
      limit(options.limit ?? 200),
    )

    // customerId filter applied locally (legacy uses 'clienteId', new uses 'customerId')

    const unsub = onSnapshot(q, snap => {
      // adaptVentaDoc normaliza legacy (estado string) y nuevo (pagado boolean)
      let result = snap.docs.map(d => adaptVentaDoc(d.id, d.data()))
      if (options.customerId) {
        result = result.filter(s => s.customerId === options.customerId)
      }
      setSales(result)
      setLoading(false)
    }, () => setLoading(false))

    return unsub
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, options.customerId])

  const now = new Date()
  const thisMonthSales = sales.filter(s => {
    const d = s.fecha instanceof Date ? s.fecha : new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const totalThisMonth = thisMonthSales.reduce((sum, s) => sum + s.total, 0)

  // Agrupar por vendedor para métricas
  const byVendedor = sales.reduce<Record<string, { nombre: string; ventas: typeof sales }>>((acc, v) => {
    const vid = v.vendedorId || 'sin_asignar'
    if (!acc[vid]) acc[vid] = { nombre: v.vendedorNombre || 'Sin asignar', ventas: [] }
    acc[vid].ventas.push(v)
    return acc
  }, {})

  return { sales, thisMonthSales, totalThisMonth, byVendedor, loading }
}
