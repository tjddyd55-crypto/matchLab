"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { OrganizerGlobalNavGroup } from "@/lib/navigation/organizer-global-navigation";
import { isOrganizerGlobalNavItemActive } from "@/lib/navigation/organizer-global-navigation";
import { cn } from "@/lib/utils";

type Density = "desktop" | "touch";

/**
 * 주최자 글로벌 메뉴 계층 UI SSOT.
 * - label 없는 그룹(홈): 1차 독립 메뉴
 * - label 있는 그룹: 섹션 헤더 + 들여쓴 하위 Link (클릭 route 없음)
 */
export function OrganizerGlobalNavGroups({
  groups,
  density = "desktop",
  onNavigate,
}: {
  groups: OrganizerGlobalNavGroup[];
  density?: Density;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const isTouch = density === "touch";

  return (
    <nav
      className="flex flex-1 flex-col overflow-y-auto"
      data-organizer-global-nav=""
      aria-label="주최자 메뉴"
    >
      {groups.map((group, groupIndex) => {
        const isHome = group.label == null;

        if (isHome) {
          return (
            <div key={group.id} data-nav-group={group.id}>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isOrganizerGlobalNavItemActive(
                    pathname,
                    item.href,
                  );
                  return (
                    <li key={`${group.id}-${item.href}`}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        data-nav-level="root"
                        data-nav-item={item.label}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center rounded-lg px-3 text-sm font-medium transition-colors",
                          isTouch ? "h-11" : "h-9",
                          active
                            ? "bg-white/14 font-bold text-white"
                            : "text-slate-300 hover:bg-white/8 hover:text-white",
                        )}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <div
                className="mt-5 border-t border-white/8"
                aria-hidden="true"
              />
            </div>
          );
        }

        return (
          <div
            key={group.id}
            className={cn(groupIndex === 1 ? "mt-3" : "mt-5")}
            data-nav-group={group.id}
          >
            <div
              data-nav-level="section"
              data-nav-section={group.label}
              className={cn(
                "flex cursor-default items-center gap-1.5 px-3 pb-1.5 pt-1",
                "text-[11px] font-bold tracking-[0.03em] text-slate-400",
              )}
            >
              <span
                className="inline-block h-1 w-1 shrink-0 rounded-full bg-slate-400/80"
                aria-hidden="true"
              />
              <span>{group.label}</span>
            </div>

            <ul
              className="ml-[18px] space-y-0.5 border-l border-white/10 pl-2"
              data-nav-children=""
            >
              {group.items.map((item) => {
                const active = isOrganizerGlobalNavItemActive(
                  pathname,
                  item.href,
                );
                return (
                  <li key={`${group.id}-${item.href}`}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      data-nav-level="item"
                      data-nav-item={item.label}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center rounded-lg px-3 text-sm font-medium transition-colors",
                        isTouch ? "h-11" : "h-9",
                        active
                          ? "bg-white/14 font-bold text-white"
                          : "text-slate-300 hover:bg-white/8 hover:text-white",
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
