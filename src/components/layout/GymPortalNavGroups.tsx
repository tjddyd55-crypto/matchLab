"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  getGymPortalNavGroups,
  isGymPortalNavItemActive,
  type GymPortalNavGroup,
} from "@/lib/navigation/gym-portal-navigation";
import { cn } from "@/lib/utils";

/**
 * PC sidebar · 모바일 Sheet 공통 렌더.
 * 상위 label은 클릭 불가 section, active는 하위 link에만 적용.
 * 들여쓰기: label pl-3(12px) / child pl-7(28px).
 */
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
  const isDesktop = density === "desktop";

  return (
    <nav
      className={cn("flex flex-col", isDesktop ? "gap-1" : "gap-1.5")}
      aria-label={isDesktop ? "회원사 사이드바" : "회원사 시트 메뉴"}
    >
      {groups.map((group, groupIndex) => {
        const isFirst = groupIndex === 0;
        return (
          <div
            key={group.id}
            className={cn(
              "flex flex-col gap-0.5",
              !isFirst && (isDesktop ? "mt-5" : "mt-4"),
            )}
          >
            {group.label ? (
              <p
                className={cn(
                  "px-3 pb-1.5 text-[11px] font-semibold leading-tight tracking-[0.02em]",
                  isDesktop ? "text-white/50" : "text-white/55",
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
                    "rounded-lg font-medium transition-colors",
                    // 하위 메뉴 들여쓰기 — 상위 label(pl-3)보다 오른쪽으로
                    group.label ? "pl-7 pr-3" : "px-3",
                    isDesktop ? "py-2 text-sm" : "min-h-11 py-2.5 text-sm",
                    active
                      ? "bg-matchon-primary-light font-semibold text-matchon-primary"
                      : "text-white/75 hover:bg-white/6 hover:text-white",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
