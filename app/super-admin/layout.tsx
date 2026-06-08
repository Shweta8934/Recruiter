'use client'

import { DashboardLayout } from '@/components/layout'
import { ProtectedRoute } from '@/components/rbac'

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute requireSuperAdmin>
      <DashboardLayout>{children}</DashboardLayout>
    </ProtectedRoute>
  )
}
