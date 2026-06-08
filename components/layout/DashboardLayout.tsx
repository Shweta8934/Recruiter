'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useDispatch } from 'react-redux'
import { authActions } from '@/store/slices/authSlice'
import { useAuth } from '@/hooks/useAuth'
import { usePermission } from '@/hooks/usePermission'
import { AppSidebar } from './AppSidebar'
import { AppHeader } from './AppHeader'
import { TenantSync } from './TenantSync'
import { Spinner } from '@/components/ui/spinner'
import { isPublicRoute } from '@/lib/routes'

interface DashboardLayoutProps {
  children: React.ReactNode
}

function SessionRedirectHandler() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isPublicRoute(pathname)) {
      const currentQuery = searchParams.toString()
      const redirectUrl = currentQuery ? `${pathname}?${currentQuery}` : pathname
      router.push(`/login?redirect=${encodeURIComponent(redirectUrl)}`)
    }
  }, [isLoading, isAuthenticated, pathname, searchParams, router])

  return null
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const { dashboardRoute } = usePermission()
  const router = useRouter()
  const dispatch = useDispatch()

  // Poll session validity every 30 seconds to detect revocation on other devices
  useEffect(() => {
    if (!isAuthenticated) return

    const checkSession = async () => {
      dispatch(authActions.checkSessionRequest({
        reject: () => {
          logout()
          router.push('/login?reason=session_revoked')
        }
      }))
    }

    // Check immediately on mount, then every 30 seconds
    checkSession()
    const interval = setInterval(checkSession, 30 * 1000)
    return () => clearInterval(interval)
  }, [isAuthenticated, logout, router, dispatch])

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="h-8 w-8" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Not authenticated - will redirect
  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Suspense fallback={null}>
        <SessionRedirectHandler />
      </Suspense>
      <TenantSync />
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
