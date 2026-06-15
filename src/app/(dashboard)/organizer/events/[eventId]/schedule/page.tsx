import { requireActor } from "@/lib/auth/actor";
import { requireOrganizerForEventPage } from "@/lib/permissions";
import { OrganizerCourtsSection } from "@/components/domain/courts/OrganizerCourtsSection";
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

  const nav = await loadEventManagementNavContext(eventId);

  return (
    <EventManagementLayout eventId={nav.eventId} publicSlug={nav.publicSlug}>
      <EventManagementPageHeader
        title="전체순서"
        eventTitle={nav.title}
        description="경기장별 경기 순서를 조정합니다. 대진표 메인의 경기장 섹션과 동일합니다."
      />

      <OrganizerCourtsSection eventId={eventId} />
    </EventManagementLayout>
  );
}
