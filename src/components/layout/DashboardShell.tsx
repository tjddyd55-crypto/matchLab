import type { ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { Sidebar } from "@/components/layout/Sidebar";
import type { OrganizerType } from "@/lib/enums";
import type { GymPortalNavViewer } from "@/lib/navigation/gym-portal-navigation";
import { getOrganizerGlobalNavGroups } from "@/lib/navigation/organizer-global-navigation";

export type DashboardRole = "organizer" | "gym" | "fighter" | "admin";

export function DashboardShell({
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

  return (
    <div className="flex min-h-screen flex-col bg-matchon-surface md:flex-row">
      <Sidebar
        className="hidden md:flex"
        role={role}
        organizerType={organizerType}
        gymNavViewer={gymNavViewer}
      />
      <div className="flex min-w-0 flex-1 flex-col pb-16 md:pb-0">
        <Header
          variant="dashboard"
          role={role}
          actorUserId={actorUserId}
          actorEmail={actorEmail}
          organizerNavGroups={organizerNavGroups}
          gymNavViewer={gymNavViewer}
        />
        <main className="min-w-0 flex-1 overflow-x-clip">{children}</main>
      </div>
      <MobileBottomNav
        className="md:hidden"
        role={role}
        gymNavViewer={gymNavViewer}
      />
    </div>
  );
}
