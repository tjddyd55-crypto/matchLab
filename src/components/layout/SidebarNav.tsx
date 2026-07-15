"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string };

function isNavActive(href: string, pathname: string, homePaths: string[]): boolean {
  if (homePaths.includes(href)) {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({
  items,
  homePaths,
}: {
  items: NavItem[];
  homePaths: string[];
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5 text-sm" aria-label="주요 메뉴">
      {items.map((item) => {
        const active = isNavActive(item.href, pathname, homePaths);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-lg px-3 py-2 font-medium transition-colors",
              active
                ? "bg-matchon-primary-light text-matchon-primary"
                : "text-white/70 hover:bg-white/6 hover:text-white",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
