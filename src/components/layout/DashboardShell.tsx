import type { ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { Sidebar } from "@/components/layout/Sidebar";
import { isMatchonDesktopRequest } from "@/lib/desktop/request";
import type { OrganizerType } from "@/lib/enums";
import type { GymPortalNavViewer } from "@/lib/navigation/gym-portal-navigation";
import { getOrganizerGlobalNavGroups } from "@/lib/navigation/organizer-global-navigation";
import { desktopAppMainClass } from "@/lib/ui/desktop-app-layout";
import { cn } from "@/lib/utils";

export type DashboardRole = "organizer" | "gym" | "fighter" | "admin";

export async function DashboardShell({
  role,
  actorUserId,
  actorEmail,
  organizerType,
  gymNavViewer = "owner",
  children,
}: {
  role: DashboardRole;
  actorUserId: string;
  actorEmail: string;
  organizerType?: OrganizerType | null;
  gymNavViewer?: GymPortalNavViewer;
  children: ReactNode;
}) {
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
          ? "min-h-full w-full flex-row flex-nowrap"
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
      />
      <div
        className={cn(
          "flex flex-col",
          isDesktop
            ? cn(desktopAppMainClass, "min-h-full pb-0")
            : "min-w-0 flex-1 pb-16 md:pb-0 desktop:pb-0",
        )}
      >
        <Header
          variant="dashboard"
          role={role}
          actorUserId={actorUserId}
          actorEmail={actorEmail}
          organizerNavGroups={organizerNavGroups}
          gymNavViewer={gymNavViewer}
          isDesktop={isDesktop}
        />
        <main
          className={cn(
            "flex-1",
            isDesktop ? "w-full overflow-x-visible" : "min-w-0 overflow-x-clip",
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
