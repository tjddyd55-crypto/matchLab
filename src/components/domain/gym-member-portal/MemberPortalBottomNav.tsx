"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { suffix: "/home", label: "홈" },
  { suffix: "/classes", label: "그룹수업" },
  { suffix: "/schedule", label: "내 일정" },
  { suffix: "/me", label: "내 정보" },
] as const;

export function MemberPortalBottomNav({ token }: { token: string }) {
  const pathname = usePathname();
  const base = `/member-portal/${token}`;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E2E8F0] bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
      aria-label="회원 포털 메뉴"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-4">
        {ITEMS.map((item) => {
          const href = `${base}${item.suffix}`;
          const active =
            pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={item.suffix}>
              <Link
                href={href}
                className={cn(
                  "flex min-h-12 flex-col items-center justify-center px-1 text-xs font-medium",
                  active ? "text-[#0A47FF]" : "text-[#64748B]",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
