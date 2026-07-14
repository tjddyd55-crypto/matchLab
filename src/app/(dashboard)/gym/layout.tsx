import { GymPortalStatusBanner } from "@/components/domain/gym/GymPortalStatusBanner";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { redirectUnlessDashboardRole, requireActor } from "@/lib/auth/actor";
import { resolveGymPortalAccess } from "@/lib/gym-portal-access";

export default async function GymDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await requireActor();
  redirectUnlessDashboardRole(actor, ["gym", "admin"]);

  let access = null as Awaited<ReturnType<typeof resolveGymPortalAccess>> | null;
  try {
    if (actor.gymId) {
      access = await resolveGymPortalAccess(actor);
    }
  } catch {
    access = null;
  }

  if (access && !access.canEnterPortal) {
    return (
      <AppShell>
        <DashboardShell
          role="gym"
          actorUserId={actor.userId}
          actorEmail={actor.email || ""}
        >
          <div className="mx-auto max-w-lg px-4 py-16">
            <h1 className="text-xl font-bold text-matchon-text-primary">
              회원사 포털 이용 불가
            </h1>
            <p className="mt-3 text-sm text-matchon-text-secondary">
              {access.bannerMessage}
            </p>
          </div>
        </DashboardShell>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <DashboardShell
        role="gym"
        actorUserId={actor.userId}
        actorEmail={actor.email || ""}
      >
        {access ? (
          <div className="px-4 pt-4 md:px-6">
            <GymPortalStatusBanner access={access} />
          </div>
        ) : null}
        {children}
      </DashboardShell>
    </AppShell>
  );
}
