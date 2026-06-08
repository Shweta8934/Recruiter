'use client'

import { DashboardLayout } from '@/components/layout'
import { ProtectedRoute } from '@/components/rbac'

export default function BillingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute
      requiredPermissions={[{ module: 'billing', action: 'view' }]}
    >
      <DashboardLayout>{children}</DashboardLayout>
    </ProtectedRoute>
  )
}
