import {
  DashboardSidebarNav,
  SidebarBrand,
  SidebarShell,
} from "@/components/layout/dashboard-sidebar";
import type { DashboardRole } from "@/components/layout/DashboardShell";
import { FighterSidebarNav } from "@/components/layout/FighterSidebarNav";
import { GymPortalNavGroups } from "@/components/layout/GymPortalNavGroups";
import { OrganizerSidebarNav } from "@/components/layout/OrganizerSidebarNav";
import { SidebarNav } from "@/components/layout/SidebarNav";
import type { OrganizerType } from "@/lib/enums";
import { getAdminHomePaths } from "@/lib/navigation/admin-navigation";
import { getFighterHomePaths } from "@/lib/navigation/fighter-navigation";
import {
  getGymPortalNavGroups,
  type GymPortalNavViewer,
} from "@/lib/navigation/gym-portal-navigation";
import { getOrganizerGlobalNavGroups } from "@/lib/navigation/organizer-global-navigation";

const homePathsByRole: Record<DashboardRole, string[]> = {
  organizer: ["/organizer"],
  gym: ["/gym"],
  fighter: getFighterHomePaths(),
  admin: getAdminHomePaths(),
};

function dashboardHomePath(role: DashboardRole): string {
  return homePathsByRole[role][0]!;
}

function sidebarAriaLabel(role: DashboardRole): string {
  if (role === "admin") return "관리자 메뉴";
  if (role === "gym") return "회원사 메뉴";
  if (role === "organizer") return "주최자 메뉴";
  return "대시보드 메뉴";
}

export function Sidebar({
  role,
  organizerType,
  gymNavViewer = "owner",
  className,
}: {
  role: DashboardRole;
  organizerType?: OrganizerType | null;
  gymNavViewer?: GymPortalNavViewer;
  className?: string;
}) {
  return (
    <SidebarShell ariaLabel={sidebarAriaLabel(role)} className={className}>
      <SidebarBrand homeHref={dashboardHomePath(role)} />
      {role === "organizer" ? (
        <OrganizerSidebarNav
          groups={getOrganizerGlobalNavGroups({ organizerType })}
        />
      ) : role === "gym" ? (
        <GymPortalNavGroups
          density="desktop"
          groups={getGymPortalNavGroups(gymNavViewer)}
        />
      ) : role === "admin" ? (
        <SidebarNav />
      ) : (
        <FighterSidebarNav />
      )}
    </SidebarShell>
  );
}
