import { requireActor } from "@/lib/auth/actor";
import { requireOrganizerForEventPage } from "@/lib/permissions";
import { eventCourtService } from "@/lib/services/event-court.service";
import { formatDivisionNameLabel } from "@/lib/bracket-snapshot";
import { eventService } from "@/lib/services/event.service";
import { EventCourtManager } from "@/components/domain/courts/EventCourtManager";
import {
  OrganizerScheduleBoard,
  mapScheduleMatches,
} from "@/components/domain/courts/OrganizerScheduleBoard";
import { EventManagementLayout } from "@/components/domain/events/EventManagementLayout";
import { EventManagementPageHeader } from "@/components/domain/events/EventManagementPageHeader";
import { loadEventManagementNavContext } from "@/lib/event-management-nav-context";

export const dynamic = "force-dynamic";

export default async function OrganizerEventSchedulePage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const actor = await requireActor();
  const { eventId } = await params;
  await requireOrganizerForEventPage(actor, eventId);

  const [nav, courts, scheduleData, divisions] = await Promise.all([
    loadEventManagementNavContext(eventId),
    eventCourtService.listForOrganizer(actor, eventId),
    eventCourtService.listScheduleMatches(actor, eventId),
    eventService.listOrganizerEventDivisions(actor, eventId),
  ]);

  const scheduleMatches = mapScheduleMatches(scheduleData.matches);

  const divisionOptions = divisions.map((d) => ({
    id: d.id,
    label: formatDivisionNameLabel(d),
    weightClass: d.weightClass,
  }));

  return (
    <EventManagementLayout eventId={nav.eventId} publicSlug={nav.publicSlug}>
      <EventManagementPageHeader
        title="전체순서"
        eventTitle={nav.title}
        description="경기장별 경기 순서를 조정합니다. 순서 변경은 경기 결과·전적에 영향을 주지 않습니다."
      />

      <EventCourtManager
        eventId={eventId}
        courts={courts}
        divisionOptions={divisionOptions}
      />

      <OrganizerScheduleBoard
        eventId={eventId}
        courts={courts.filter((c) => c.isActive)}
        matches={scheduleMatches}
      />
    </EventManagementLayout>
  );
}
