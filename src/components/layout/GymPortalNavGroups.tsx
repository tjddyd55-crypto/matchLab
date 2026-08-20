"use client";

import { DashboardSidebarNav } from "@/components/layout/dashboard-sidebar";
import {
  getGymPortalNavGroups,
  isGymPortalNavItemActive,
  type GymPortalNavGroup,
} from "@/lib/navigation/gym-portal-navigation";

export function GymPortalNavGroups({
  groups = getGymPortalNavGroups(),
  density = "desktop",
  onNavigate,
}: {
  groups?: GymPortalNavGroup[];
  density?: "desktop" | "mobile";
  onNavigate?: () => void;
}) {
  return (
    <DashboardSidebarNav
      groups={groups}
      isItemActive={(href, pathname) =>
        isGymPortalNavItemActive(href, pathname)
      }
      density={density === "mobile" ? "touch" : "desktop"}
      ariaLabel={density === "desktop" ? "회원사 사이드바" : "회원사 시트 메뉴"}
      onNavigate={onNavigate}
    />
  );
}
