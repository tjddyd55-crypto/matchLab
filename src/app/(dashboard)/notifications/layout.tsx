import { AppShell } from "@/components/layout/AppShell";
import { DashboardShell } from "@/components/layout/DashboardShell";
import {
  redirectUnlessDashboardRole,
  requireActor,
} from "@/lib/auth/actor";
import { dashboardRoleFor } from "@/lib/dashboard-navigation";

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
        actor={actor}
      >
        {children}
      </DashboardShell>
    </AppShell>
  );
}
