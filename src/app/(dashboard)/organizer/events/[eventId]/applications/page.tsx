import { requireActor } from "@/lib/auth/actor";
import { requireOrganizerForEventPage } from "@/lib/permissions";
import { applicationService } from "@/lib/services/application.service";
import { externalRegistrationLinkService } from "@/lib/services/external-registration-link.service";
import { TENANT_FEATURE_KEYS } from "@/lib/platform-features/tenant-feature-keys";
import { tenantFeatureEntitlementService } from "@/lib/services/tenant-feature-entitlement.service";
import { TenantFeatureOwnerType } from "@/generated/prisma";
import { OrganizerApplicationsBoard } from "@/components/domain/applications/OrganizerApplicationsBoard";
import { EventManagementLayout } from "@/components/domain/events/EventManagementLayout";
import {
  loadEventManagementNavContext,
  eventManagementLayoutProps,
} from "@/lib/event-management-nav-context";

export const dynamic = "force-dynamic";

export default async function OrganizerEventApplicationsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const actor = await requireActor();
  const { eventId } = await params;

  await requireOrganizerForEventPage(actor, eventId);

  const [nav, rows, manualRegistrationOptions, externalRegistrationLink, messagingFeatureEnabled] =
    await Promise.all([
      loadEventManagementNavContext(eventId),
      applicationService.listOrganizerEventApplications(actor, eventId),
      applicationService.getOrganizerManualRegistrationOptions(actor, eventId),
      externalRegistrationLinkService.getLink(actor, eventId),
      actor.organizerId
        ? tenantFeatureEntitlementService.hasTenantFeature(
            TenantFeatureOwnerType.association,
            actor.organizerId,
            TENANT_FEATURE_KEYS.TENANT_MESSAGING,
          )
        : Promise.resolve(false),
    ]);

  return (
    <EventManagementLayout {...eventManagementLayoutProps(nav)}>
      <OrganizerApplicationsBoard
        eventId={eventId}
        rows={rows}
        manualRegistrationOptions={manualRegistrationOptions}
        externalRegistrationLink={externalRegistrationLink}
        messagingFeatureEnabled={messagingFeatureEnabled}
      />
    </EventManagementLayout>
  );
}
