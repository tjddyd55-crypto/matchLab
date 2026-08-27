import { OrganizerDashboardRouteContent } from "@/components/dashboard/OrganizerDashboardRouteContent";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { OrganizerPortalBlockedView } from "@/components/domain/organizer/OrganizerPortalBlockedView";
import { OrganizerPortalStatusBanner } from "@/components/domain/organizer/OrganizerPortalStatusBanner";
import { redirectUnlessDashboardRole, requireActor } from "@/lib/auth/actor";
import { billingCheckoutRedirectPath } from "@/lib/billing/entitlement";
import { dashboardRoleFor } from "@/lib/dashboard-navigation";
import { extractOrganizerEventIdFromPath } from "@/lib/organizer-route-path";
import { resolveOrganizerPortalAccess } from "@/lib/organizer-portal-access";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function OrganizerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await requireActor();
  redirectUnlessDashboardRole(actor, ["organizer", "admin"]);

  if (actor.role === "organizer") {
    const billingRedirect = await billingCheckoutRedirectPath(actor);
    if (billingRedirect) {
      redirect(billingRedirect);
    }
  }

  const pathname =
    (await headers()).get("x-matchon-pathname")?.trim() ?? "";
  const eventId = extractOrganizerEventIdFromPath(pathname);

  let access = null as Awaited<
    ReturnType<typeof resolveOrganizerPortalAccess>
  > | null;
  if (actor.role === "organizer") {
    try {
      access = await resolveOrganizerPortalAccess(actor, { eventId });
    } catch {
      access = null;
    }
  }

  if (access && !access.canEnterPortal) {
    return (
      <AppShell>
        <DashboardShell
          role={dashboardRoleFor(actor.role)}
          actorUserId={actor.userId}
          actorEmail={actor.email || ""}
          organizerType={actor.organizerType}
        >
          <OrganizerPortalBlockedView access={access} />
        </DashboardShell>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <DashboardShell
        role={dashboardRoleFor(actor.role)}
        actorUserId={actor.userId}
        actorEmail={actor.email || ""}
        organizerType={actor.organizerType}
      >
        {access?.bannerMessage ? (
          <div className="px-4 pt-4 md:px-6">
            <OrganizerPortalStatusBanner access={access} />
          </div>
        ) : null}
        <OrganizerDashboardRouteContent>{children}</OrganizerDashboardRouteContent>
      </DashboardShell>
    </AppShell>
  );
}
