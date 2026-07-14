"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/organizer/member-gyms/overview", label: "현황" },
  { href: "/organizer/member-gyms/applications", label: "가입 신청" },
  { href: "/organizer/member-gyms", label: "회원사 목록" },
  { href: "/organizer/member-gyms/settings", label: "환경 설정" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/organizer/member-gyms") {
    return (
      pathname === href ||
      (/^\/organizer\/member-gyms\/[^/]+$/.test(pathname) &&
        !ITEMS.some(
          (i) => i.href !== href && pathname.startsWith(i.href),
        ))
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MemberGymSubNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-2 border-b border-matchon-border pb-3">
      {ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm transition-colors",
              active
                ? "bg-matchon-primary font-semibold text-white"
                : "text-matchon-text-secondary hover:bg-matchon-primary-light hover:text-matchon-primary",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
