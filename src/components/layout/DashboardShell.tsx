import type { ReactNode } from "react";
import type { ActorContext } from "@/lib/auth/actor-context";
import { resolveDashboardHeaderIdentity } from "@/lib/auth/dashboard-header-identity";
import { Header } from "@/components/layout/Header";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { Sidebar } from "@/components/layout/Sidebar";
import { isMatchonDesktopRequest } from "@/lib/desktop/request";
import type { OrganizerType } from "@/lib/enums";
import type { GymPortalNavViewer } from "@/lib/navigation/gym-portal-navigation";
import type { GymPortalAssociationNavInput } from "@/lib/navigation/gym-portal-navigation";
import { getOrganizerGlobalNavGroups } from "@/lib/navigation/organizer-global-navigation";
import { desktopAppMainClass, desktopAppMainColumnClass, desktopAppMainContentClass, desktopAppShellRootClass } from "@/lib/ui/desktop-app-layout";
import { cn } from "@/lib/utils";

export type DashboardRole = "organizer" | "gym" | "fighter" | "admin";

export async function DashboardShell({
  role,
  actor,
  organizerType,
  gymNavViewer = "owner",
  gymAssociations = [],
  children,
}: {
  role: DashboardRole;
  actor: ActorContext;
  organizerType?: OrganizerType | null;
  gymNavViewer?: GymPortalNavViewer;
  gymAssociations?: GymPortalAssociationNavInput[];
  children: ReactNode;
}) {
  const headerIdentity = await resolveDashboardHeaderIdentity(actor);
  const organizerNavGroups =
    role === "organizer"
      ? getOrganizerGlobalNavGroups({ organizerType })
      : undefined;
  const isDesktop = await isMatchonDesktopRequest();

  return (
    <div
      className={cn(
        "flex bg-matchon-surface",
        isDesktop
          ? cn(
              desktopAppShellRootClass,
              "h-full min-h-0 w-full flex-1 flex-row flex-nowrap overflow-hidden",
            )
          : "min-h-screen flex-col md:flex-row",
      )}
    >
      <Sidebar
        className={
          isDesktop ? "flex shrink-0" : "hidden md:flex desktop:flex"
        }
        canvasScroll={isDesktop}
        role={role}
        organizerType={organizerType}
        gymNavViewer={gymNavViewer}
        gymAssociations={gymAssociations}
      />
      <div
        className={cn(
          "flex flex-col",
          isDesktop
            ? cn(
                desktopAppMainClass,
                desktopAppMainColumnClass,
                "h-full min-h-0 flex-1 overflow-hidden pb-0",
              )
            : "min-w-0 flex-1 pb-16 md:pb-0 desktop:pb-0",
        )}
      >
        <Header
          variant="dashboard"
          role={role}
          actorUserId={actor.userId}
          identityPrimary={headerIdentity.primaryLabel}
          identitySecondary={headerIdentity.secondaryLabel}
          organizerNavGroups={organizerNavGroups}
          gymNavViewer={gymNavViewer}
          gymAssociations={gymAssociations}
          isDesktop={isDesktop}
        />
        <main
          className={cn(
            "flex-1",
            isDesktop
              ? cn(desktopAppMainContentClass, "w-full overflow-x-visible")
              : "min-w-0 overflow-x-clip",
          )}
        >
          {children}
        </main>
      </div>
      <MobileBottomNav
        className={isDesktop ? "hidden" : "md:hidden desktop:hidden"}
        role={role}
        gymNavViewer={gymNavViewer}
      />
    </div>
  );
}
