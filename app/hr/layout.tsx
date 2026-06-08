'use client'

import { DashboardLayout } from '@/components/layout'
import { ProtectedRoute } from '@/components/rbac'

export default function HRLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <DashboardLayout>{children}</DashboardLayout>
    </ProtectedRoute>
  )
}
