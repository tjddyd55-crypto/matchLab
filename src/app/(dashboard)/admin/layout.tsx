import { AppShell } from "@/components/layout/AppShell";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { AdminNavStrip } from "@/components/domain/admin/AdminNavStrip";
import { redirectUnlessDashboardRole, requireActor } from "@/lib/auth/actor";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await requireActor();
  redirectUnlessDashboardRole(actor, ["admin"]);

  return (
    <AppShell>
      <DashboardShell
        role="admin"
        actorUserId={actor.userId}
        actorEmail={actor.email || ""}
      >
        <AdminNavStrip />
        {children}
      </DashboardShell>
    </AppShell>
  );
}
