'use client'

import { useState, useEffect } from 'react'
import { collection, query, orderBy, limit, where, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Sale } from '@/features/sales/types'

interface UseSalesOptions {
  customerId?: string
  limit?: number
}

export function useSales(workspaceId: string, options: UseSalesOptions = {}) {
  const [sales,   setSales]   = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!workspaceId) { setLoading(false); return }

    let q = query(
      collection(db, `workspaces/${workspaceId}/sales`),
      orderBy('fecha', 'desc'),
      limit(options.limit ?? 200),
    )

    if (options.customerId) {
      q = query(q, where('customerId', '==', options.customerId))
    }

    const unsub = onSnapshot(q, snap => {
      setSales(snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        fecha:     d.data().fecha?.toDate?.()     ?? new Date(),
        createdAt: d.data().createdAt?.toDate?.() ?? new Date(),
        updatedAt: d.data().updatedAt?.toDate?.() ?? new Date(),
        pagadoAt:  d.data().pagadoAt?.toDate?.(),
      } as Sale)))
      setLoading(false)
    }, () => setLoading(false))

    return unsub
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, options.customerId])

  // Métricas del mes actual calculadas en cliente (sin Firestore extra)
  const now = new Date()
  const thisMonthSales = sales.filter(s => {
    const d = s.fecha
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })

  const totalThisMonth = thisMonthSales.reduce((sum, s) => sum + s.total, 0)

  return { sales, thisMonthSales, totalThisMonth, loading }
}
