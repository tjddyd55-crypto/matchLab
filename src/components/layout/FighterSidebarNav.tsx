"use client";

import { DashboardSidebarNav } from "@/components/layout/dashboard-sidebar";
import {
  getFighterNavGroups,
  isFighterNavItemActive,
} from "@/lib/navigation/fighter-navigation";

/**
 * 선수 글로벌 사이드바 엔트리.
 * Client boundary 안에서 isItemActive를 바인딩해 Server → Client 함수 전달을 피한다.
 */
export function FighterSidebarNav({
  density = "desktop",
}: {
  density?: "desktop" | "touch";
}) {
  return (
    <DashboardSidebarNav
      groups={getFighterNavGroups()}
      isItemActive={isFighterNavItemActive}
      density={density}
      ariaLabel="선수 메뉴"
    />
  );
}
