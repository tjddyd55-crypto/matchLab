import type { ReactNode } from "react";
import { MemberPortalBottomNav } from "@/components/domain/gym-member-portal/MemberPortalBottomNav";

export function MemberPortalAppShell({
  token,
  gymName,
  children,
}: {
  token: string;
  gymName: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto min-h-[100dvh] max-w-lg pb-24">
      <header className="sticky top-0 z-30 border-b border-[#E2E8F0] bg-white/95 px-4 py-3 backdrop-blur pt-[max(0.75rem,env(safe-area-inset-top))]">
        <p className="text-xs font-semibold text-[#0A47FF]">MATCHON</p>
        <h1 className="mt-0.5 text-base font-bold text-[#001C7A] break-keep">
          {gymName}
        </h1>
      </header>
      <main className="px-4 py-4">{children}</main>
      <MemberPortalBottomNav token={token} />
    </div>
  );
}
