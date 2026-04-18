export type PlanTier = 'free' | 'pro' | 'team' | 'scale'

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'paused'
  | 'grace_period'

export interface PlanSubscription {
  id: string
  userId: string
  tier: PlanTier
  status: SubscriptionStatus
  stripeSubscriptionId?: string
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
  gracePeriodEnd?: Date
  downgradeToTier?: PlanTier
  createdAt: Date
  updatedAt: Date
}

export interface PlanLimits {
  maxCustomers: number    // Infinity para ilimitado
  maxMembers: number
  maxWorkspaces: number
  canExport: boolean
  hasApi: boolean
}
