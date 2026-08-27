import Link from "next/link";
import { MatchonLogo } from "@/components/common/MatchonLogo";
import type { DashboardRole } from "@/components/layout/DashboardShell";
import { AdminMobileNavSheet } from "@/components/layout/AdminMobileNavSheet";
import { GymMobileNavSheet } from "@/components/layout/GymMobileNavSheet";
import { OrganizerMobileNavSheet } from "@/components/layout/OrganizerMobileNavSheet";
import { LogoutButton } from "@/components/domain/auth/LogoutButton";
import { DesktopHeaderVersion } from "@/components/domain/desktop/DesktopHeaderVersion";
import { DesktopUpdateStatusButton } from "@/components/domain/desktop/DesktopUpdateStatusButton";
import { NotificationBell } from "@/components/domain/notifications/NotificationBell";
import type {
  GymPortalAssociationNavInput,
  GymPortalNavViewer,
} from "@/lib/navigation/gym-portal-navigation";
import type { OrganizerGlobalNavGroup } from "@/lib/navigation/organizer-global-navigation";

type HeaderProps =
  | { variant: "public" }
  | {
      variant: "dashboard";
      role: DashboardRole;
      actorUserId: string;
      actorEmail: string;
      organizerNavGroups?: OrganizerGlobalNavGroup[];
      /** 체육관 포털은 관장/선생님이 서로 다른 메뉴를 본다. */
      gymNavViewer?: GymPortalNavViewer;
      gymAssociations?: GymPortalAssociationNavInput[];
      /** MATCHON Manager — 공개 홈 숨김 등 UI만 분기 (권한 아님). */
      isDesktop?: boolean;
    };

export function Header(props: HeaderProps) {
  if (props.variant === "public") {
    return null;
  }

  const titles: Record<DashboardRole, string> = {
    organizer: "주최자",
    gym: "체육관",
    fighter: "선수",
    admin: "관리자",
  };
  const isDesktop = Boolean(props.isDesktop);

  return (
    <header className="border-b border-matchon-border bg-white px-4 py-3 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {!isDesktop && props.role === "organizer" && props.organizerNavGroups ? (
            <OrganizerMobileNavSheet groups={props.organizerNavGroups} />
          ) : null}
          {!isDesktop && props.role === "gym" ? (
            <GymMobileNavSheet
              viewer={props.gymNavViewer ?? "owner"}
              associations={props.gymAssociations ?? []}
            />
          ) : null}
          {!isDesktop && props.role === "admin" ? (
            <AdminMobileNavSheet />
          ) : null}
          <MatchonLogo
            href={
              props.role === "organizer"
                ? "/organizer"
                : props.role === "gym"
                  ? "/gym"
                  : props.role === "fighter"
                    ? "/fighter"
                    : "/admin"
            }
            variant="light"
            size="sm"
            className="shrink-0 md:hidden desktop:hidden"
          />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-sm font-semibold text-matchon-text-primary">
              {titles[props.role]} 대시보드
            </span>
            <span className="truncate text-xs text-matchon-text-secondary">
              {props.actorEmail}
            </span>
          </div>
        </div>
        <div
          className={
            isDesktop
              ? "flex shrink-0 flex-nowrap items-center gap-2"
              : "flex flex-wrap items-center gap-2"
          }
        >
          <NotificationBell userId={props.actorUserId} />
          {isDesktop ? <DesktopUpdateStatusButton /> : null}
          {isDesktop ? <DesktopHeaderVersion /> : null}
          {!isDesktop ? (
            <Link
              href="/"
              className="text-xs text-matchon-text-secondary hover:text-matchon-text-primary"
            >
              공개 홈
            </Link>
          ) : null}
          <LogoutButton
            afterLogoutPath={isDesktop ? "/desktop/login" : undefined}
            className={isDesktop ? "h-8 px-2.5 text-xs" : undefined}
          />
        </div>
      </div>
    </header>
  );
}
