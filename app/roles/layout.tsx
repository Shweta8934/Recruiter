"use client";

import { ProtectedRoute } from "@/components/rbac";

export default function RolesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute
      requiredPermissions={["roles:read"]}
      requireAll={false}
    >
      {children}
    </ProtectedRoute>
  );
}
