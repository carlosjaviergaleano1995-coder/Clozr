'use client'

import { useState, useEffect } from 'react'
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { PipelineItem, PipelineStatus } from '@/features/pipeline/types'

interface UsePipelineOptions {
  status?: PipelineStatus
  customerId?: string
}

export function usePipeline(
  workspaceId: string,
  options: UsePipelineOptions = {},
) {
  const [items,   setItems]   = useState<PipelineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<Error | null>(null)

  useEffect(() => {
    if (!workspaceId) { setLoading(false); return }

    let q = query(
      collection(db, `workspaces/${workspaceId}/pipeline`),
      orderBy('updatedAt', 'desc'),
      limit(300),
    )

    if (options.status) {
      q = query(q, where('status', '==', options.status))
    }
    if (options.customerId) {
      q = query(q, where('customerId', '==', options.customerId))
    }

    const unsub = onSnapshot(
      q,
      snap => {
        setItems(snap.docs.map(d => ({
          id: d.id,
          ...d.data(),
          createdAt:      d.data().createdAt?.toDate?.()      ?? new Date(),
          updatedAt:      d.data().updatedAt?.toDate?.()      ?? new Date(),
          lastActivityAt: d.data().lastActivityAt?.toDate?.() ?? new Date(),
          closedAt:       d.data().closedAt?.toDate?.(),
          nextActionAt:   d.data().nextActionAt?.toDate?.(),
          activities: (d.data().activities ?? []).map((a: any) => ({
            ...a,
            performedAt: a.performedAt?.toDate?.() ?? new Date(),
          })),
        } as PipelineItem)))
        setLoading(false)
      },
      err => { setError(err); setLoading(false) },
    )

    return unsub
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, options.status, options.customerId])

  // Agrupar por stage para el tablero kanban
  const byStage = items.reduce<Record<string, PipelineItem[]>>((acc, item) => {
    if (!acc[item.stageId]) acc[item.stageId] = []
    acc[item.stageId].push(item)
    return acc
  }, {})

  // Items con alerta de inactividad
  const withAlerts = items.filter(i => i.status === 'open' && i.inactiveDays >= 7)

  return { items, byStage, withAlerts, loading, error }
}
