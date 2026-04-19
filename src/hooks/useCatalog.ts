'use client'

import { useState, useEffect } from 'react'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { CatalogItem } from '@/features/catalog/types'

export function useCatalog(workspaceId: string) {
  const [items,   setItems]   = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!workspaceId) { setLoading(false); return }

    const q = query(
      collection(db, `workspaces/${workspaceId}/catalog`),
      where('activo', '==', true),
      orderBy('orden', 'asc'),
    )

    const unsub = onSnapshot(q, snap => {
      setItems(snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.() ?? new Date(),
      } as CatalogItem)))
      setLoading(false)
    }, () => setLoading(false))

    return unsub
  }, [workspaceId])

  return { items, loading }
}
