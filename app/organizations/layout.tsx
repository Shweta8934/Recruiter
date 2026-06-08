'use client'

import { DashboardLayout } from '@/components/layout'
import { ProtectedRoute } from '@/components/rbac'

export default function OrganizationsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute
      requiredPermissions={[{ module: 'organizations', action: 'view' }]}
    >
      <DashboardLayout>{children}</DashboardLayout>
    </ProtectedRoute>
  )
}
