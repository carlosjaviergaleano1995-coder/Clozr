import type { PlanTier, PlanLimits } from '@/features/billing/types'

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: {
    maxCustomers:   100,
    maxMembers:     1,
    maxWorkspaces:  1,
    canExport:      false,
    hasApi:         false,
  },
  pro: {
    maxCustomers:   Infinity,
    maxMembers:     1,
    maxWorkspaces:  1,
    canExport:      true,
    hasApi:         false,
  },
  team: {
    maxCustomers:   Infinity,
    maxMembers:     5,
    maxWorkspaces:  3,
    canExport:      true,
    hasApi:         false,
  },
  scale: {
    maxCustomers:   Infinity,
    maxMembers:     20,
    maxWorkspaces:  Infinity,
    canExport:      true,
    hasApi:         true,
  },
}

export function getPlanLimits(tier: PlanTier): PlanLimits {
  return PLAN_LIMITS[tier]
}

// Jerarquía de planes para comparaciones
export const PLAN_ORDER: Record<PlanTier, number> = {
  free:  0,
  pro:   1,
  team:  2,
  scale: 3,
}

export function planIsAtLeast(current: PlanTier, required: PlanTier): boolean {
  return PLAN_ORDER[current] >= PLAN_ORDER[required]
}

// Siguiente plan (para mensajes de upgrade)
export const NEXT_PLAN: Record<PlanTier, PlanTier | null> = {
  free:  'pro',
  pro:   'team',
  team:  'scale',
  scale: null,
}

export function getNextPlan(tier: PlanTier): PlanTier | null {
  return NEXT_PLAN[tier]
}
