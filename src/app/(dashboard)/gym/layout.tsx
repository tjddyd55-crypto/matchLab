import { AppShell } from "@/components/layout/AppShell";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { redirectUnlessDashboardRole, requireActor } from "@/lib/auth/actor";

export default async function GymDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await requireActor();
  redirectUnlessDashboardRole(actor, ["gym", "admin"]);

  return (
    <AppShell>
      <DashboardShell
        role="gym"
        actorUserId={actor.userId}
        actorEmail={actor.email || ""}
      >
        {children}
      </DashboardShell>
    </AppShell>
  );
}
