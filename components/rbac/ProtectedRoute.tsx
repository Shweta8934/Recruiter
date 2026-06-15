'use client'

import { useEffect, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { usePermission } from '@/hooks/usePermission'
import type { Module, Action } from '@/types/rbac'
import { Spinner } from '@/components/ui/spinner'
import { getTenantSlugFromUrl } from '../layout/TenantSync'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredPermissions?: { module: Module; action: Action }[]
  requireSuperAdmin?: boolean
  requireOrgAdmin?: boolean
  redirectTo?: string
}

export function ProtectedRoute({
  children,
  requiredPermissions,
  requireSuperAdmin = false,
  requireOrgAdmin = false,
  redirectTo = '/403',
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const { hasAllPermissions, isSuperAdmin, isOrgAdmin } = usePermission()
  const router = useRouter()
  const pathname = usePathname()

  // Detect if there's a tenant mismatch (pending sync)
  const hostname = typeof window !== 'undefined' ? window.location.hostname : undefined
  const tenantSlugInUrl = getTenantSlugFromUrl(pathname, hostname)

  // Check membership
  const hasMembership = useMemo(() => {
    if (!tenantSlugInUrl || isSuperAdmin) return true
    return user?.memberships?.some((m: any) => m.organizationSlug === tenantSlugInUrl) ?? false
  }, [tenantSlugInUrl, user?.memberships, isSuperAdmin])

  const isTenantMismatch = useMemo(() => {
    return !!(tenantSlugInUrl && user && user.organizationSlug !== tenantSlugInUrl && !isSuperAdmin && hasMembership)
  }, [tenantSlugInUrl, user, isSuperAdmin, hasMembership])

  useEffect(() => {
    if (isLoading) return

    if (!isAuthenticated) {
      router.push('/login')
      return
    }

    // Check unauthorized tenant access
    if (tenantSlugInUrl && !isSuperAdmin && !hasMembership) {
      router.push(redirectTo)
      return
    }

    // Check super admin requirement
    if (requireSuperAdmin && !isSuperAdmin) {
      router.push(redirectTo)
      return
    }

    // Check org admin requirement
    if (requireOrgAdmin && !isOrgAdmin && !isSuperAdmin) {
      router.push(redirectTo)
      return
    }

    // Check specific permissions
    if (requiredPermissions && !isSuperAdmin) {
      if (!hasAllPermissions(requiredPermissions)) {
        router.push(redirectTo)
        return
      }
    }
  }, [
    isLoading,
    isAuthenticated,
    isSuperAdmin,
    isOrgAdmin,
    hasAllPermissions,
    requiredPermissions,
    requireSuperAdmin,
    requireOrgAdmin,
    redirectTo,
    router,
    tenantSlugInUrl,
    hasMembership,
  ])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
