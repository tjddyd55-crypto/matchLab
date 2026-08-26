import { LogoutButton } from "@/components/domain/auth/LogoutButton";
import { GymPortalStatusBanner } from "@/components/domain/gym/GymPortalStatusBanner";
import { GymStaffPasswordChangeGate } from "@/components/domain/gym/GymStaffPasswordChangeGate";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { redirectUnlessDashboardRole, requireActor } from "@/lib/auth/actor";
import { GymStatus } from "@/lib/enums";
import { resolveGymPortalAccess } from "@/lib/gym-portal-access";

export default async function GymDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await requireActor();
  redirectUnlessDashboardRole(actor, ["gym", "gym_staff", "admin"]);

  const gymNavViewer =
    actor.role === "gym_staff" ? ("staff" as const) : ("owner" as const);
  const mustChangePassword =
    actor.role === "gym_staff" && Boolean(actor.mustChangePassword);

  let access = null as Awaited<ReturnType<typeof resolveGymPortalAccess>> | null;
  try {
    if (actor.gymId) {
      access = await resolveGymPortalAccess(actor);
    }
  } catch {
    access = null;
  }

  if (access && !access.canEnterPortal) {
    const isArchived = access.gym.status === GymStatus.archived;
    const title = isArchived
      ? "운영 종료된 체육관"
      : access.accessMode === "platform_suspended"
        ? "서비스 이용 일시정지"
        : "회원사 포털 이용 불가";
    return (
      <AppShell>
        <DashboardShell
          role="gym"
          actorUserId={actor.userId}
          actorEmail={actor.email || ""}
          gymNavViewer={gymNavViewer}
        >
          <div className="mx-auto max-w-lg px-4 py-16">
            <h1 className="text-xl font-bold text-matchon-text-primary">
              {title}
            </h1>
            <p className="mt-3 text-sm text-matchon-text-secondary">
              {access.bannerMessage}
            </p>
            <div className="mt-6">
              <LogoutButton />
            </div>
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
        gymNavViewer={gymNavViewer}
      >
        <GymStaffPasswordChangeGate mustChangePassword={mustChangePassword}>
          {access && !mustChangePassword ? (
            <div className="px-4 pt-4 md:px-6">
              <GymPortalStatusBanner access={access} />
            </div>
          ) : null}
          {children}
        </GymStaffPasswordChangeGate>
      </DashboardShell>
    </AppShell>
  );
}
