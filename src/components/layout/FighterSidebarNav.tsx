"use client";

import { DashboardSidebarNav } from "@/components/layout/dashboard-sidebar";
import {
  getFighterNavGroups,
  isFighterNavItemActive,
} from "@/lib/navigation/fighter-navigation";

/**
 * 선수 글로벌 사이드바 — isItemActive 콜백은 Client Component 내부에서만 생성한다.
 * Server Component(Sidebar)에서 함수 props를 넘기면 RSC serialization 오류가 난다.
 */
export function FighterSidebarNav({
  density = "desktop",
}: {
  density?: "desktop" | "touch";
}) {
  return (
    <DashboardSidebarNav
      groups={getFighterNavGroups()}
      isItemActive={(href, pathname) => isFighterNavItemActive(href, pathname)}
      density={density}
      ariaLabel="선수 메뉴"
    />
  );
}
