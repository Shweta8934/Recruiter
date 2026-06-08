// Subscription Types

export type BillingCycle = 'monthly' | 'yearly'
export type PlanTier = 'free' | 'starter' | 'professional' | 'enterprise'

export interface PlanLimits {
  maxMembers: number
  maxRoles: number
  maxInvitesPerMonth: number
  maxJobs: number
  maxCandidates: number
  reportsAccess: boolean
  billingAccess: boolean
  customRoles: boolean
  apiAccess: boolean
}

export interface SubscriptionPlan {
  id: string
  name: string
  slug: string
  price: number
  billingCycle: BillingCycle
  description: string
  features: string[]
  limits: PlanLimits
  isPopular?: boolean
}

export interface OrganizationSubscription {
  id: string
  organizationId: string
  planId: string
  status: 'active' | 'cancelled' | 'past_due' | 'trialing'
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  createdAt: string
}

export interface SubscriptionUsage {
  membersUsed: number
  membersLimit: number
  rolesUsed: number
  rolesLimit: number
  invitesUsedThisMonth: number
  invitesLimit: number
  jobsUsed: number
  jobsLimit: number
  candidatesUsed: number
  candidatesLimit: number
}
