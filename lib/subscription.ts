// Subscription Helper Functions
import type { User } from '@/types/auth'
import type { SubscriptionPlan, SubscriptionUsage, PlanLimits } from '@/types/subscription'
import { subscriptionPlans, getPlanById, getSubscriptionByOrganization } from '@/data/subscriptions'
import { getUsersByOrganization } from '@/data/users'
import { roles } from '@/data/roles'
import { invites } from '@/data/invites'
import { getOrganizationById } from '@/data/organizations'

// Get the current plan for a user's organization
export function getCurrentPlan(user: User | null): SubscriptionPlan | null {
  if (!user?.organizationId) return null

  const org = getOrganizationById(user.organizationId)
  if (!org) return null

  return getPlanById(org.subscriptionPlanId) || null
}

// Get subscription usage for an organization
export function getSubscriptionUsage(organizationId: string): SubscriptionUsage {
  const org = getOrganizationById(organizationId)
  const plan = org ? getPlanById(org.subscriptionPlanId) : null
  const limits = plan?.limits || getDefaultLimits()

  const members = getUsersByOrganization(organizationId)
  const orgRoles = roles.filter(r => r.organizationId === organizationId)
  const orgInvites = invites.filter(i => 
    i.organizationId === organizationId && 
    i.status === 'pending' &&
    new Date(i.createdAt).getMonth() === new Date().getMonth()
  )

  return {
    membersUsed: members.length,
    membersLimit: limits.maxMembers,
    rolesUsed: orgRoles.length,
    rolesLimit: limits.maxRoles,
    invitesUsedThisMonth: orgInvites.length,
    invitesLimit: limits.maxInvitesPerMonth,
    jobsUsed: 12, // Placeholder
    jobsLimit: limits.maxJobs,
    candidatesUsed: 45, // Placeholder
    candidatesLimit: limits.maxCandidates,
  }
}

// Get default limits (free tier)
function getDefaultLimits(): PlanLimits {
  return {
    maxMembers: 5,
    maxRoles: 2,
    maxInvitesPerMonth: 5,
    maxJobs: 10,
    maxCandidates: 50,
    reportsAccess: false,
    billingAccess: false,
    customRoles: false,
    apiAccess: false,
  }
}

// Check if organization can add more members
export function canAddMember(organizationId: string): boolean {
  const usage = getSubscriptionUsage(organizationId)
  return usage.membersUsed < usage.membersLimit
}

// Check if organization can create custom roles
export function canCreateCustomRole(organizationId: string): boolean {
  const org = getOrganizationById(organizationId)
  if (!org) return false

  const plan = getPlanById(org.subscriptionPlanId)
  if (!plan) return false

  const usage = getSubscriptionUsage(organizationId)
  return plan.limits.customRoles && usage.rolesUsed < usage.rolesLimit
}

// Check if organization can send more invites this month
export function canSendInvite(organizationId: string): boolean {
  const usage = getSubscriptionUsage(organizationId)
  return usage.invitesUsedThisMonth < usage.invitesLimit
}

// Check if a feature is available for the plan
export function hasFeatureAccess(
  organizationId: string,
  feature: keyof PlanLimits
): boolean {
  const org = getOrganizationById(organizationId)
  if (!org) return false

  const plan = getPlanById(org.subscriptionPlanId)
  if (!plan) return false

  const value = plan.limits[feature]
  return typeof value === 'boolean' ? value : true
}

// Get upgrade suggestions based on current usage
export function getUpgradeSuggestions(organizationId: string): string[] {
  const usage = getSubscriptionUsage(organizationId)
  const suggestions: string[] = []

  const memberPercentage = (usage.membersUsed / usage.membersLimit) * 100
  if (memberPercentage >= 80) {
    suggestions.push('You are approaching your member limit. Consider upgrading for more team members.')
  }

  const invitePercentage = (usage.invitesUsedThisMonth / usage.invitesLimit) * 100
  if (invitePercentage >= 80) {
    suggestions.push('You are running low on monthly invites. Upgrade for unlimited invites.')
  }

  const org = getOrganizationById(organizationId)
  const plan = org ? getPlanById(org.subscriptionPlanId) : null

  if (plan && !plan.limits.customRoles) {
    suggestions.push('Upgrade to Professional to create custom roles with specific permissions.')
  }

  if (plan && !plan.limits.reportsAccess) {
    suggestions.push('Upgrade to access detailed analytics and reports.')
  }

  return suggestions
}

// Get all available plans
export function getAllPlans(): SubscriptionPlan[] {
  return subscriptionPlans
}

// Calculate usage percentage
export function calculateUsagePercentage(used: number, limit: number): number {
  if (limit === 0 || limit >= 9999) return 0
  return Math.min(Math.round((used / limit) * 100), 100)
}
