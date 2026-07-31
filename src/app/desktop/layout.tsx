import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

/**
 * MATCHON Manager desktop entry layout.
 * 공개 홈/마케팅 navigation 없이 최소 shell만 제공.
 */
export default function DesktopLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">{children}</div>
  );
}
