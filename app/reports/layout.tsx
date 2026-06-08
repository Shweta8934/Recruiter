"use client";

import { ProtectedRoute } from "@/components/rbac";

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute requiredPermissions={[{ module: "reports", action: "view" }]}>{children}</ProtectedRoute>;
}
