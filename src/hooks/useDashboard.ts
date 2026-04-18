'use client'

import { useState, useEffect } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { DashboardMetrics } from '@/features/dashboard/types'

export function useDashboardMetrics(workspaceId: string) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!workspaceId) { setLoading(false); return }

    const ref = doc(db, `workspaces/${workspaceId}/aggregate/summary`)
    const unsub = onSnapshot(ref, snap => {
      if (!snap.exists()) {
        setMetrics(null)
      } else {
        const data = snap.data()
        const now  = new Date()
        setMetrics({
          salesCountThisMonth:    data.totalSalesCount      ?? 0,
          salesTotalARSThisMonth: data.totalRevenueARS       ?? 0,
          salesTotalUSDThisMonth: data.totalRevenueUSD       ?? 0,
          pipelineOpenCount:      data.pipelineOpenCount     ?? 0,
          pipelineWonThisMonth:   data.pipelineWonCount      ?? 0,
          customersTotal:         data.customersCreatedCount ?? 0,
          pipelineInactiveCount:  0,
          tasksDueToday:          0,
          month:                  data.month ?? '',
          updatedAt:              data.updatedAt?.toDate?.() ?? now,
        })
      }
      setLoading(false)
    }, () => setLoading(false))

    return unsub
  }, [workspaceId])

  return { metrics, loading }
}
