import { OrganizerDashboardContent } from "@/components/dashboard/OrganizerDashboardContent";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { redirectUnlessDashboardRole, requireActor } from "@/lib/auth/actor";

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
        role="organizer"
        actorUserId={actor.userId}
        actorEmail={actor.email || ""}
      >
        <OrganizerDashboardContent>{children}</OrganizerDashboardContent>
      </DashboardShell>
    </AppShell>
  );
}
