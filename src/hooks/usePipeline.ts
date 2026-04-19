'use client'

// El adapter detecta legacy (clienteId) vs nuevo (customerId) y normaliza al canónico.
// Importante: Firestore no puede filtrar por customerId en docs legacy que usan clienteId.
// Por eso: se trae todo y se filtra localmente cuando hay customerId.

import { useState, useEffect } from 'react'
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { PipelineItem, PipelineStatus } from '@/features/pipeline/types'
import { adaptPipelineDoc } from '@/features/pipeline/adapters'

interface UsePipelineOptions {
  status?:     PipelineStatus
  customerId?: string   // filtra localmente para compat legacy
  limit?:      number   // default 300
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
      limit(options.limit ?? 300),
    )

    // Solo filtramos por status en Firestore si no hay customerId
    // (combinar where('status') + where('customerId') requiere índice compuesto
    // y además no funciona con docs legacy que usan 'clienteId')
    if (options.status && !options.customerId) {
      q = query(q, where('status', '==', options.status))
    }

    const unsub = onSnapshot(
      q,
      snap => {
        let all = snap.docs.map(d => adaptPipelineDoc(d.id, d.data()))

        // Filtrado local — garantiza compat con legacy (clienteId) y nuevo (customerId)
        if (options.customerId) {
          all = all.filter(i => i.customerId === options.customerId)
        }
        if (options.status) {
          all = all.filter(i => i.status === options.status)
        }

        setItems(all)
        setLoading(false)
      },
      err => { setError(err); setLoading(false) }
    )

    return unsub
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, options.status, options.customerId])

  const byStage    = items.reduce<Record<string, PipelineItem[]>>((acc, item) => {
    if (!acc[item.stageId]) acc[item.stageId] = []
    acc[item.stageId].push(item)
    return acc
  }, {})

  const withAlerts = items.filter(i => i.status === 'open' && i.inactiveDays >= 7)

  return { items, byStage, withAlerts, loading, error }
}
