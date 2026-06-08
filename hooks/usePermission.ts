'use client'

import { useCallback, useMemo } from 'react'
import { useAuth } from './useAuth'
import type { Module, Action } from '@/types/rbac'
import { 
  hasPermission as checkPermission, 
  hasAnyPermission as checkAnyPermission,
  hasAllPermissions as checkAllPermissions,
  canManageOrganization as checkCanManageOrg,
  isSuperAdmin as checkIsSuperAdmin,
  isOrgAdmin as checkIsOrgAdmin,
  getSidebarItems,
  getDashboardRoute,
} from '@/lib/rbac'

export function usePermission() {
  const { user } = useAuth()

  const hasPermission = useCallback(
    (module: Module, action: Action): boolean => {
      return checkPermission(user, module, action)
    },
    [user]
  )

  const hasAnyPermission = useCallback(
    (permissions: { module: Module; action: Action }[]): boolean => {
      return checkAnyPermission(user, permissions)
    },
    [user]
  )

  const hasAllPermissions = useCallback(
    (permissions: { module: Module; action: Action }[]): boolean => {
      return checkAllPermissions(user, permissions)
    },
    [user]
  )

  const canManageOrganization = useCallback(
    (organizationId: string): boolean => {
      return checkCanManageOrg(user, organizationId)
    },
    [user]
  )

  const isSuperAdmin = useMemo(() => checkIsSuperAdmin(user), [user])
  const isOrgAdmin = useMemo(() => checkIsOrgAdmin(user), [user])
  
  const sidebarItems = useMemo(() => getSidebarItems(user), [user])
  const dashboardRoute = useMemo(() => getDashboardRoute(user), [user])

  const can = useCallback(
    (permission: `${string}:${string}`): boolean => {
      const [module, action] = permission.split(':')
      if (!module || !action) return false
      return checkPermission(user, module as Module, action as Action)
    },
    [user]
  )

  return {
    can,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canManageOrganization,
    isSuperAdmin,
    isOrgAdmin,
    sidebarItems,
    dashboardRoute,
  }
}
