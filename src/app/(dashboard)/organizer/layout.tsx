import { OrganizerDashboardRouteContent } from "@/components/dashboard/OrganizerDashboardRouteContent";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { redirectUnlessDashboardRole, requireActor } from "@/lib/auth/actor";
import { dashboardRoleFor } from "@/lib/dashboard-navigation";

export default async function OrganizerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await requireActor();
  redirectUnlessDashboardRole(actor, ["organizer", "admin"]);

  return (
    <AppShell>
      <DashboardShell
        role={dashboardRoleFor(actor.role)}
        actorUserId={actor.userId}
        actorEmail={actor.email || ""}
      >
        <OrganizerDashboardRouteContent>{children}</OrganizerDashboardRouteContent>
      </DashboardShell>
    </AppShell>
  );
}
