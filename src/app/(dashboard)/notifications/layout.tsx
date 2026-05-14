import { AppShell } from "@/components/layout/AppShell";
import type { DashboardRole } from "@/components/layout/DashboardShell";
import { DashboardShell } from "@/components/layout/DashboardShell";
import {
  redirectUnlessDashboardRole,
  requireActor,
} from "@/lib/auth/actor";

function dashboardRoleFor(actorRole: string): DashboardRole {
  switch (actorRole) {
    case "admin":
      return "admin";
    case "organizer":
      return "organizer";
    case "gym":
      return "gym";
    case "fighter":
      return "fighter";
    default:
      return "fighter";
  }
}

export default async function NotificationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await requireActor();
  redirectUnlessDashboardRole(actor, [
    "fighter",
    "gym",
    "organizer",
    "admin",
  ]);

  return (
    <AppShell>
      <DashboardShell
        role={dashboardRoleFor(actor.role)}
        actorUserId={actor.userId}
        actorEmail={actor.email || ""}
      >
        {children}
      </DashboardShell>
    </AppShell>
  );
}
