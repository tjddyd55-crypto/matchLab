import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default function MemberPortalLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] bg-[#F8FAFC] text-[#0F172A]">
      {children}
    </div>
  );
}
