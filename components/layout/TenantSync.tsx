'use client'

/**
 * TenantSync: Watches the URL for tenant slug changes and syncs the Redux user
 * state (organizationId, roleSlug, roleId) to match the current tenant.
 *
 * This makes role-based sidebar and permissions update immediately when the
 * user switches orgs via the URL (e.g. /organization/company-a → /organization/company-b)
 * WITHOUT requiring a new login.
 */

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useDispatch } from 'react-redux'
import { useAuth } from '@/hooks/useAuth'
import { authActions } from '@/store/slices/authSlice'
import { storeUser } from '@/lib/auth'

export function getTenantSlugFromUrl(pathname: string, hostname?: string): string | null {
  // 1. Extract from path: /organization/[slug]/...
  if (pathname && pathname.startsWith('/organization/')) {
    const parts = pathname.split('/')
    if (parts.length > 2 && parts[2]) {
      return parts[2]
    }
  }

  // 2. Extract from subdomain if present (e.g. company-a.localhost:3000)
  if (hostname) {
    const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1')
    const hostParts = hostname.split('.')
    if ((isLocalhost && hostParts.length > 1 && !hostname.startsWith('localhost')) || (!isLocalhost && hostParts.length > 2)) {
      return hostParts[0]
    }
  }

  return null
}

export function TenantSync() {
  const pathname = usePathname()
  const dispatch = useDispatch()
  const { user } = useAuth()
  const lastSlugRef = useRef<string | null>(null)
  const inFlightSlugRef = useRef<string | null>(null)

  useEffect(() => {
    if (!user || !pathname) return

    const hostname = typeof window !== 'undefined' ? window.location.hostname : undefined
    const currentSlug = getTenantSlugFromUrl(pathname, hostname)

    // No slug in URL, nothing to sync
    if (!currentSlug) return

    // Already synced for this slug — skip
    if (lastSlugRef.current === currentSlug) return

    // Find the membership matching this slug
    const membership = user.memberships?.find(
      (m: any) => m.organizationSlug === currentSlug
    )

    if (!membership) {
      console.warn(`TenantSync: No membership found for slug "${currentSlug}". User may not have access.`)
      return
    }

    // Already on this org — skip
    if (user.organizationId === membership.organizationId && user.organizationSlug === currentSlug) {
      lastSlugRef.current = currentSlug
      return
    }

    if (inFlightSlugRef.current === currentSlug) return
    inFlightSlugRef.current = currentSlug

    const fallbackRoleSlug = membership.role
    const fallbackRoleId = user.roleId || ''



    ;(async () => {
      try {
        // Keep server session (cookie JWT) in sync with URL tenant context
        await new Promise<void>((resolve, reject) => {
          dispatch(authActions.switchTenantApiRequest({
            targetOrganizationId: membership.organizationId,
            resolve: (serverData) => {
              const syncedRoleSlug = serverData?.roleSlug || fallbackRoleSlug
              const syncedRoleId = serverData?.roleId || fallbackRoleId

              // Update Redux user state so permissions/sidebar/guards react
              dispatch(
                authActions.switchTenantUser({
                  organizationId: membership.organizationId,
                  organizationSlug: currentSlug,
                  roleSlug: syncedRoleSlug,
                  roleId: syncedRoleId,
                })
              )

              // Persist the user snapshot for refresh continuity
              const updatedUser = {
                ...user,
                organizationId: membership.organizationId,
                organizationSlug: currentSlug,
                roleSlug: syncedRoleSlug,
                roleId: syncedRoleId,
              }
              storeUser(updatedUser)

              // Re-bootstrap tenant-scoped datasets
              dispatch(authActions.appInitRequest({ user: updatedUser }))

              lastSlugRef.current = currentSlug
              resolve()
            },
            reject: (err) => {
              console.warn('TenantSync: switch-tenant failed:', err)
              inFlightSlugRef.current = null
              reject(err)
            }
          }))
        })
      } catch (err) {
        console.warn('TenantSync: switch-tenant network error:', err)
      } finally {
        inFlightSlugRef.current = null
      }
    })()
  }, [pathname, user, dispatch])

  return null
}
