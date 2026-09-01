import { AppShell } from "@/components/layout/AppShell";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { redirectUnlessDashboardRole, requireActor } from "@/lib/auth/actor";

export default async function FighterDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await requireActor();
  redirectUnlessDashboardRole(actor, ["fighter", "admin"]);

  return (
    <AppShell>
      <DashboardShell
        role="fighter"
        actor={actor}
      >
        {children}
      </DashboardShell>
    </AppShell>
  );
}
