import { MatchonLogo } from "@/components/common/MatchonLogo";
import type { DashboardRole } from "@/components/layout/DashboardShell";
import { GymPortalNavGroups } from "@/components/layout/GymPortalNavGroups";
import { OrganizerSidebarNav } from "@/components/layout/OrganizerSidebarNav";
import { SidebarNav } from "@/components/layout/SidebarNav";
import type { OrganizerType } from "@/lib/enums";
import {
  getAdminHomePaths,
  getAdminNavItems,
} from "@/lib/navigation/admin-navigation";
import { getGymPortalHomePaths } from "@/lib/navigation/gym-portal-navigation";
import { getOrganizerGlobalNavGroups } from "@/lib/navigation/organizer-global-navigation";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string };

const navByRole: Record<
  Exclude<DashboardRole, "organizer" | "gym" | "admin">,
  NavItem[]
> = {
  fighter: [
    { href: "/fighter", label: "홈" },
    { href: "/fighter/profile", label: "내 프로필" },
    { href: "/fighter/events", label: "내 대회·경기" },
    { href: "/fighter/records", label: "전적" },
    { href: "/notifications", label: "알림" },
  ],
};

const homePathsByRole: Record<DashboardRole, string[]> = {
  organizer: ["/organizer"],
  gym: getGymPortalHomePaths(),
  fighter: ["/fighter"],
  admin: getAdminHomePaths(),
};

function dashboardHomePath(role: DashboardRole): string {
  return homePathsByRole[role][0]!;
}

export function Sidebar({
  role,
  organizerType,
  className,
}: {
  role: DashboardRole;
  organizerType?: OrganizerType | null;
  className?: string;
}) {
  return (
    <aside
      className={cn(
        "flex min-h-screen w-[var(--global-sidebar-width)] shrink-0 flex-col border-r border-white/8 bg-matchon-sidebar px-3 py-4",
        className,
      )}
      aria-label={
        role === "admin"
          ? "관리자 메뉴"
          : role === "gym"
            ? "회원사 메뉴"
            : role === "organizer"
              ? "주최자 메뉴"
              : "대시보드 메뉴"
      }
    >
      <div className="mb-4 px-2">
        <MatchonLogo
          href={dashboardHomePath(role)}
          variant="dark"
          size="sm"
        />
      </div>
      {role === "organizer" ? (
        <OrganizerSidebarNav
          groups={getOrganizerGlobalNavGroups({ organizerType })}
        />
      ) : role === "gym" ? (
        <GymPortalNavGroups density="desktop" />
      ) : role === "admin" ? (
        <SidebarNav
          items={getAdminNavItems()}
          homePaths={getAdminHomePaths()}
        />
      ) : (
        <SidebarNav
          items={navByRole[role]}
          homePaths={homePathsByRole[role]}
        />
      )}
    </aside>
  );
}
