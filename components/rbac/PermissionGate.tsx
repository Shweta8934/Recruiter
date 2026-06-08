'use client'

import { usePermission } from '@/hooks/usePermission'
import type { Module, Action } from '@/types/rbac'
import type { ReactNode } from 'react'

interface PermissionGateProps {
  module: Module
  action: Action
  children: ReactNode
  fallback?: ReactNode
}

export function PermissionGate({
  module,
  action,
  children,
  fallback = null,
}: PermissionGateProps) {
  const { hasPermission } = usePermission()

  if (!hasPermission(module, action)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

interface MultiPermissionGateProps {
  permissions: { module: Module; action: Action }[]
  mode?: 'any' | 'all'
  children: ReactNode
  fallback?: ReactNode
}

export function MultiPermissionGate({
  permissions,
  mode = 'any',
  children,
  fallback = null,
}: MultiPermissionGateProps) {
  const { hasAnyPermission, hasAllPermissions } = usePermission()

  const hasAccess = mode === 'any' 
    ? hasAnyPermission(permissions) 
    : hasAllPermissions(permissions)

  if (!hasAccess) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

interface SuperAdminGateProps {
  children: ReactNode
  fallback?: ReactNode
}

export function SuperAdminGate({ children, fallback = null }: SuperAdminGateProps) {
  const { isSuperAdmin } = usePermission()

  if (!isSuperAdmin) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

interface OrgAdminGateProps {
  children: ReactNode
  fallback?: ReactNode
  includeSuperAdmin?: boolean
}

export function OrgAdminGate({ 
  children, 
  fallback = null,
  includeSuperAdmin = true,
}: OrgAdminGateProps) {
  const { isOrgAdmin, isSuperAdmin } = usePermission()

  const hasAccess = isOrgAdmin || (includeSuperAdmin && isSuperAdmin)

  if (!hasAccess) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
