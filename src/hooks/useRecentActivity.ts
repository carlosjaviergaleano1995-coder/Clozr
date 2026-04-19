'use client'

import { useState, useEffect } from 'react'
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { AuditAction } from '@/features/audit/types'

export interface ActivityEntry {
  id:         string
  action:     AuditAction
  actorName:  string
  entityType?: string
  metadata?:  Record<string, unknown>
  timestamp:  Date
}

export function useRecentActivity(workspaceId: string, maxItems = 5) {
  const [activity, setActivity] = useState<ActivityEntry[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!workspaceId) { setLoading(false); return }

    const q = query(
      collection(db, `workspaces/${workspaceId}/audit_log`),
      orderBy('timestamp', 'desc'),
      limit(maxItems),
    )

    const unsub = onSnapshot(q, snap => {
      setActivity(snap.docs.map(d => ({
        id:         d.id,
        action:     d.data().action as AuditAction,
        actorName:  d.data().actorName ?? '',
        entityType: d.data().entityType ?? undefined,
        metadata:   d.data().metadata   ?? undefined,
        timestamp:  d.data().timestamp?.toDate?.() ?? new Date(),
      })))
      setLoading(false)
    }, () => setLoading(false))

    return unsub
  }, [workspaceId, maxItems])

  return { activity, loading }
}
