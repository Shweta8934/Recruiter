"use client";

import { ProtectedRoute } from "@/components/rbac";

export default function MembersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute
      requiredPermissions={[{ module: "members", action: "view" }]}
    >
      {children}
    </ProtectedRoute>
  );
}
