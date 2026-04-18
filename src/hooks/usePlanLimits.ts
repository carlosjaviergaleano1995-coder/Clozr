'use client'

// El plan del usuario vive en el documento Firestore /users/{uid}.
// Por ahora lo leemos desde el store de workspaces del usuario actual
// o usamos 'free' como default seguro.
// Cuando se implemente la integración de billing, este hook
// leerá del AppUser store.

import { getPlanLimits, getNextPlan } from '@/config/plans'
import type { PlanTier } from '@/features/billing/types'

// El tier se pasa como prop — el componente que lo use lo obtiene
// desde su contexto (AppUser, cookie de sesión, etc.)
export function usePlanLimits(tier: PlanTier = 'free') {
  const limits = getPlanLimits(tier)

  return {
    tier,
    limits,
    nextPlan: getNextPlan(tier),
    canExport:  limits.canExport,
    hasApi:     limits.hasApi,
    isAtLimit: {
      customers:  (count: number) => count >= limits.maxCustomers,
      members:    (count: number) => count >= limits.maxMembers,
      workspaces: (count: number) => count >= limits.maxWorkspaces,
    },
    usagePct: {
      customers: (count: number) =>
        limits.maxCustomers === Infinity
          ? 0
          : Math.min(100, Math.round((count / limits.maxCustomers) * 100)),
    },
  }
}
