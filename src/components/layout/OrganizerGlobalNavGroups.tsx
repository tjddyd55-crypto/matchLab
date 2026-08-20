"use client";

import { DashboardSidebarNav } from "@/components/layout/dashboard-sidebar";
import type { OrganizerGlobalNavGroup } from "@/lib/navigation/organizer-global-navigation";
import { isOrganizerGlobalNavItemActive } from "@/lib/navigation/organizer-global-navigation";

export function OrganizerGlobalNavGroups({
  groups,
  density = "desktop",
  onNavigate,
}: {
  groups: OrganizerGlobalNavGroup[];
  density?: "desktop" | "touch";
  onNavigate?: () => void;
}) {
  return (
    <DashboardSidebarNav
      groups={groups}
      isItemActive={(href, pathname) =>
        isOrganizerGlobalNavItemActive(pathname, href)
      }
      density={density}
      ariaLabel="주최자 메뉴"
      onNavigate={onNavigate}
      dataOrganizerGlobalNav
    />
  );
}
