'use client'

import { useState, useEffect } from 'react'
import { collection, query, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Membership } from '@/features/team/types'

export function useMembers(workspaceId: string) {
  const [members, setMembers] = useState<Membership[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!workspaceId) { setLoading(false); return }

    const q = query(collection(db, `workspaces/${workspaceId}/members`))

    const unsub = onSnapshot(q, snap => {
      setMembers(snap.docs.map(d => ({
        id:          d.id,
        ...d.data(),
        joinedAt:    d.data().joinedAt?.toDate?.() ?? new Date(),
      } as Membership)))
      setLoading(false)
    }, () => setLoading(false))

    return unsub
  }, [workspaceId])

  return { members, loading }
}
