"use client";

import { usePathname } from "next/navigation";
import { usePermission } from "@/hooks/usePermission";
import { AccessDeniedCard } from "@/components/common";

export default function InvitesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { can } = usePermission();

  const isSendPage = pathname?.startsWith("/invites/send");
  const hasAccess = isSendPage ? can("invites:create") : can("invites:view");

  if (!hasAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <AccessDeniedCard />
      </div>
    );
  }

  return <>{children}</>;
}
