'use client'

// REGLA: hook solo, Client SDK + onSnapshot.
// El adapter detecta si el doc es legacy (PipelineCliente) o nuevo (PipelineItem)
// y retorna siempre PipelineItem canónico.

import { useState, useEffect } from 'react'
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { PipelineItem, PipelineStatus } from '@/features/pipeline/types'
import { adaptPipelineDoc } from '@/features/pipeline/adapters'

interface UsePipelineOptions {
  status?:     PipelineStatus
  customerId?: string
}

export function usePipeline(workspaceId: string, options: UsePipelineOptions = {}) {
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

    if (options.customerId) q = query(q, where('customerId',  '==', options.customerId))
    if (options.status)     q = query(q, where('status',      '==', options.status))

    const unsub = onSnapshot(
      q,
      snap => {
        // adaptPipelineDoc detecta legacy vs nuevo y normaliza al canónico
        setItems(snap.docs.map(d => adaptPipelineDoc(d.id, d.data())))
        setLoading(false)
      },
      err => { setError(err); setLoading(false) }
    )

    return unsub
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, options.status, options.customerId])

  const byStage = items.reduce<Record<string, PipelineItem[]>>((acc, item) => {
    if (!acc[item.stageId]) acc[item.stageId] = []
    acc[item.stageId].push(item)
    return acc
  }, {})

  const withAlerts = items.filter(i => i.status === 'open' && i.inactiveDays >= 7)

  return { items, byStage, withAlerts, loading, error }
}
