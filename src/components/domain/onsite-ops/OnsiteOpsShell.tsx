"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  onsiteOpsTabHref,
  parseOnsiteOpsTab,
  type OnsiteOpsTab,
} from "@/lib/onsite-ops/token";
import { cn } from "@/lib/utils";

const TABS: { id: OnsiteOpsTab; label: string }[] = [
  { id: "weighin", label: "계체" },
  { id: "matches", label: "경기운영" },
];

export function OnsiteOpsBottomNav({ token }: { token: string }) {
  const searchParams = useSearchParams();
  const tab = parseOnsiteOpsTab(searchParams.get("tab"));

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E2E8F0] bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
      aria-label="현장 운영 메뉴"
    >
      <div className="mx-auto grid max-w-lg grid-cols-2">
        {TABS.map((item) => {
          const active = tab === item.id;
          return (
            <Link
              key={item.id}
              href={onsiteOpsTabHref(token, item.id)}
              className={cn(
                "flex min-h-[52px] flex-col items-center justify-center px-2 py-2 text-sm font-semibold transition-colors",
                active
                  ? "text-[#0A47FF]"
                  : "text-[#64748B] hover:text-[#334155]",
              )}
              aria-current={active ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function OnsiteOpsShell({
  token,
  eventTitle,
  eventLocation,
  children,
}: {
  token: string;
  eventTitle: string;
  eventLocation: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto min-h-[100dvh] max-w-lg pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-30 border-b border-[#E2E8F0] bg-white/95 px-4 py-3 backdrop-blur pt-[max(0.75rem,env(safe-area-inset-top))]">
        <p className="text-xs font-semibold text-[#0A47FF]">MATCHON 현장 운영</p>
        <h1 className="mt-0.5 text-base font-bold text-[#001C7A] break-keep">
          {eventTitle}
        </h1>
        {eventLocation ? (
          <p className="text-muted-foreground mt-0.5 text-xs">{eventLocation}</p>
        ) : null}
      </header>
      <main className="px-3 py-3 sm:px-4">
        {children}
      </main>
      <OnsiteOpsBottomNav token={token} />
    </div>
  );
}
