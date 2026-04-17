'use client'

import { useEffect, useState } from 'react'
import { getMemberRole } from '@/lib/services'
import { useAuthStore } from '@/store'
import type { MemberRole } from '@/types'

// Jerarquía de roles
const ROLE_LEVEL: Record<MemberRole, number> = {
  owner:    4,
  admin:    3,
  vendedor: 2,
  viewer:   1,
}

export function useMemberRole(workspaceId: string) {
  const { user } = useAuthStore()
  const [role, setRole] = useState<MemberRole | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || !workspaceId) { setLoading(false); return }
    getMemberRole(workspaceId, user.uid)
      .then(r => setRole(r))
      .finally(() => setLoading(false))
  }, [workspaceId, user])

  const can = (minRole: MemberRole): boolean => {
    if (!role) return false
    return ROLE_LEVEL[role] >= ROLE_LEVEL[minRole]
  }

  return {
    role,
    loading,
    isOwner:    role === 'owner',
    isAdmin:    role === 'admin' || role === 'owner',
    isVendedor: can('vendedor'),
    isViewer:   !!role,
    can,
  }
}
