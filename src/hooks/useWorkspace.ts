'use client'

import { useState, useEffect } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Workspace } from '@/features/workspaces/types'
import type { Membership } from '@/features/team/types'
import { useAuthStore } from '@/store'

// ── useWorkspace ──────────────────────────────────────────────────────────────
// Suscripción en tiempo real al documento del workspace.
// Usado en el layout — garantiza que los cambios de sistema activo se reflejen
// sin reload de página.

interface UseWorkspaceReturn {
  workspace: Workspace | null
  loading:   boolean
  error:     Error | null
}

export function useWorkspace(workspaceId: string): UseWorkspaceReturn {
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<Error | null>(null)

  useEffect(() => {
    if (!workspaceId) { setLoading(false); return }

    const ref = doc(db, `workspaces/${workspaceId}`)
    const unsub = onSnapshot(
      ref,
      snap => {
        if (!snap.exists()) {
          setWorkspace(null)
          setLoading(false)
          return
        }
        const data = snap.data()
        setWorkspace({
          id: snap.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() ?? new Date(),
          updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
          activeSystemActivatedAt: data.activeSystemActivatedAt?.toDate?.(),
        } as Workspace)
        setLoading(false)
      },
      err => { setError(err); setLoading(false) },
    )

    return unsub
  }, [workspaceId])

  return { workspace, loading, error }
}

// ── useWorkspaceMembership ────────────────────────────────────────────────────
// Lee el Membership del usuario actual en tiempo real.
// Garantía: si el doc existe → acceso activo. Si no existe → sin acceso.

interface UseMembershipReturn {
  membership: Membership | null
  loading:    boolean
}

export function useWorkspaceMembership(workspaceId: string): UseMembershipReturn {
  const { user } = useAuthStore()
  const [membership, setMembership] = useState<Membership | null>(null)
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    if (!workspaceId || !user?.uid) { setLoading(false); return }

    const ref = doc(db, `workspaces/${workspaceId}/members/${user.uid}`)
    const unsub = onSnapshot(
      ref,
      snap => {
        if (!snap.exists()) {
          setMembership(null)
        } else {
          setMembership({
            id: snap.id,
            ...snap.data(),
            joinedAt: snap.data().joinedAt?.toDate?.() ?? new Date(),
          } as Membership)
        }
        setLoading(false)
      },
      () => { setMembership(null); setLoading(false) },
    )

    return unsub
  }, [workspaceId, user?.uid])

  return { membership, loading }
}
