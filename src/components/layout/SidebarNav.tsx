"use client";

import { DashboardSidebarNav } from "@/components/layout/dashboard-sidebar";
import {
  getAdminHomePaths,
  getAdminNavGroups,
  isAdminNavItemActive,
} from "@/lib/navigation/admin-navigation";

/**
 * 관리자 글로벌 사이드바 엔트리.
 * 항목 목록은 getAdminNavGroups SSOT이며, items prop은 하위 호환용으로 무시한다.
 */
export function SidebarNav({
  homePaths = getAdminHomePaths(),
  density = "desktop",
}: {
  items?: { href: string; label: string }[];
  homePaths?: string[];
  density?: "desktop" | "touch";
}) {
  return (
    <DashboardSidebarNav
      groups={getAdminNavGroups()}
      isItemActive={(href, pathname) =>
        isAdminNavItemActive(href, pathname, homePaths)
      }
      density={density}
      ariaLabel="주요 메뉴"
    />
  );
}
