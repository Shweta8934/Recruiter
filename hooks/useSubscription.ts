'use client'

import { useMemo } from 'react'
import { useAuth } from './useAuth'
import type { SubscriptionPlan, SubscriptionUsage, PlanLimits } from '@/types/subscription'
import {
  getCurrentPlan,
  getSubscriptionUsage,
  canAddMember,
  canCreateCustomRole,
  canSendInvite,
  hasFeatureAccess,
  getUpgradeSuggestions,
  getAllPlans,
  calculateUsagePercentage,
} from '@/lib/subscription'

export function useSubscription() {
  const { user } = useAuth()

  const currentPlan = useMemo((): SubscriptionPlan | null => {
    return getCurrentPlan(user)
  }, [user])

  const usage = useMemo((): SubscriptionUsage | null => {
    if (!user?.organizationId) return null
    return getSubscriptionUsage(user.organizationId)
  }, [user])

  const canAddMoreMembers = useMemo((): boolean => {
    if (!user?.organizationId) return false
    return canAddMember(user.organizationId)
  }, [user])

  const canCreateRole = useMemo((): boolean => {
    if (!user?.organizationId) return false
    return canCreateCustomRole(user.organizationId)
  }, [user])

  const canInvite = useMemo((): boolean => {
    if (!user?.organizationId) return false
    return canSendInvite(user.organizationId)
  }, [user])

  const hasFeature = (feature: keyof PlanLimits): boolean => {
    if (!user?.organizationId) return false
    return hasFeatureAccess(user.organizationId, feature)
  }

  const upgradeSuggestions = useMemo((): string[] => {
    if (!user?.organizationId) return []
    return getUpgradeSuggestions(user.organizationId)
  }, [user])

  const allPlans = useMemo(() => getAllPlans(), [])

  return {
    currentPlan,
    usage,
    canAddMoreMembers,
    canCreateRole,
    canInvite,
    hasFeature,
    upgradeSuggestions,
    allPlans,
    calculateUsagePercentage,
  }
}
