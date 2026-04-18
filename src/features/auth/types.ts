import type { PlanTier } from '@/features/billing/types'

export interface AppUser {
  uid: string
  email: string
  displayName: string
  photoURL?: string
  plan: PlanTier
  planSubscriptionId?: string
  stripeCustomerId?: string
  onboardingCompleted: boolean
  workspaceCount: number
  isClozrAdmin?: boolean
  createdAt: Date
  lastSeenAt: Date
}
