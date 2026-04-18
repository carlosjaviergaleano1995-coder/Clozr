'use client'

import { useEffect, useState } from 'react'
import { getMemberRole } from '@/lib/services'
import { useAuthStore, useWorkspaceStore } from '@/store'
import type { MemberRole } from '@/types'

const ROLE_LEVEL: Record<MemberRole, number> = {
  owner:    4,
  admin:    3,
  vendedor: 2,
  viewer:   1,
}

export function useMemberRole(workspaceId: string) {
  const { user } = useAuthStore()
  const { workspaces } = useWorkspaceStore()
  const [role, setRole] = useState<MemberRole | null>(null)
  const [loading, setLoading] = useState(true)

  const ws = workspaces.find(w => w.id === workspaceId)
  const isOwnerByField = !!user && !!ws && ws.ownerId === user.uid

  useEffect(() => {
    if (!user || !workspaceId) { setLoading(false); return }
    getMemberRole(workspaceId, user.uid)
      .then(r => {
        if (r) {
          setRole(r)
        } else if (isOwnerByField) {
          setRole('owner')
        } else {
          // Sin registro → vendedor por defecto (puede editar, no config)
          setRole('vendedor')
        }
      })
      .finally(() => setLoading(false))
  }, [workspaceId, user?.uid])

  const effectiveRole = role ?? (isOwnerByField ? 'owner' : 'vendedor')

  const can = (minRole: MemberRole): boolean =>
    ROLE_LEVEL[effectiveRole] >= ROLE_LEVEL[minRole]

  return {
    role:         effectiveRole,
    loading,
    isOwner:      effectiveRole === 'owner',
    isAdmin:      effectiveRole === 'admin' || effectiveRole === 'owner',
    isVendedor:   can('vendedor'),                 // vendedor, admin u owner
    isViewerOnly: effectiveRole === 'viewer',      // SOLO viewer — no puede editar
    can,
  }
}
