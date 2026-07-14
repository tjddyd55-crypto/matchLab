"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  getGymPortalNavGroups,
  isGymPortalNavItemActive,
  type GymPortalNavGroup,
} from "@/lib/navigation/gym-portal-navigation";
import { cn } from "@/lib/utils";

export function GymPortalNavGroups({
  groups = getGymPortalNavGroups(),
  density = "desktop",
  onNavigate,
}: {
  groups?: GymPortalNavGroup[];
  density?: "desktop" | "mobile";
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const linkClass =
    density === "desktop"
      ? "rounded-lg px-3 py-2 font-medium transition-colors"
      : "rounded-lg px-3 py-2.5 text-sm font-medium transition-colors";

  return (
    <nav className="flex flex-col gap-3 text-sm" aria-label="회원사 메뉴">
      {groups.map((group) => (
        <div key={group.id} className="flex flex-col gap-0.5">
          {group.label ? (
            <p
              className={cn(
                "px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide",
                density === "desktop"
                  ? "text-white/45"
                  : "text-white/50",
              )}
            >
              {group.label}
            </p>
          ) : null}
          {group.items.map((item) => {
            const active = isGymPortalNavItemActive(item.href, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  linkClass,
                  active
                    ? "bg-matchon-primary-light text-matchon-primary"
                    : "text-white/70 hover:bg-white/6 hover:text-white",
                )}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
