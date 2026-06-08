import React from "react";

export function PageContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      {children}
    </div>
  );
}
