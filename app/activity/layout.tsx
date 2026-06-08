"use client";

import { ProtectedRoute } from "@/components/rbac";

export default function ActivityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute
      requiredPermissions={["activity:read"]}
      requireAll={false}
    >
      {children}
    </ProtectedRoute>
  );
}
