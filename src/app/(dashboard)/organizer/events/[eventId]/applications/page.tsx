import { requireActor } from "@/lib/auth/actor";
import { requireOrganizerForEventPage } from "@/lib/permissions";
import { applicationService } from "@/lib/services/application.service";
import { externalRegistrationLinkService } from "@/lib/services/external-registration-link.service";
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

  const [nav, rows, manualRegistrationOptions, externalRegistrationLink] =
    await Promise.all([
      loadEventManagementNavContext(eventId),
      applicationService.listOrganizerEventApplications(actor, eventId),
      applicationService.getOrganizerManualRegistrationOptions(actor, eventId),
      externalRegistrationLinkService.getLink(actor, eventId),
    ]);

  return (
    <EventManagementLayout {...eventManagementLayoutProps(nav)}>
      <OrganizerApplicationsBoard
        eventId={eventId}
        rows={rows}
        manualRegistrationOptions={manualRegistrationOptions}
        externalRegistrationLink={externalRegistrationLink}
      />
    </EventManagementLayout>
  );
}
