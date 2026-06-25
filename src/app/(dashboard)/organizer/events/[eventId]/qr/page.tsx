import { EventManagementLayout } from "@/components/domain/events/EventManagementLayout";
import { EventManagementPageHeader } from "@/components/domain/events/EventManagementPageHeader";
import { EventQrPrintBoard } from "@/components/domain/events/qr/EventQrPrintBoard";
import { requireActor } from "@/lib/auth/actor";
import { requireOrganizerForEventPage, resolveOrganizerEventPageError } from "@/lib/permissions";
import { loadEventManagementNavContext } from "@/lib/event-management-nav-context";
import { eventService } from "@/lib/services/event.service";
import { eventCourtService } from "@/lib/services/event-court.service";
import { getServerAppBaseUrl } from "@/lib/qr-url";
import { buildCourtJudgeQrLinks } from "@/lib/services/judge-qr-entry.service";
import { liveStreamService } from "@/lib/services/live-stream.service";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export default async function OrganizerEventQrPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const actor = await requireActor();
  const { eventId } = await params;
  await requireOrganizerForEventPage(actor, eventId);

  let detail;
  try {
    detail = await eventService.getOrganizerEventDetail(actor, eventId);
  } catch (e) {
    resolveOrganizerEventPageError(e);
  }

  const [nav, courts, headersList] = await Promise.all([
    loadEventManagementNavContext(eventId),
    eventCourtService.listForOrganizer(actor, eventId),
    headers(),
  ]);

  const baseUrl = getServerAppBaseUrl(headersList);
  const activeCourts = courts.filter((c) => c.isActive);
  const courtQrLinks = buildCourtJudgeQrLinks(eventId, activeCourts, baseUrl);
  const publicLiveStreamCount = detail.publicSlug
    ? (await liveStreamService.listPublicForEventSlug(detail.publicSlug)).length
    : 0;

  return (
    <EventManagementLayout eventId={nav.eventId} publicSlug={nav.publicSlug}>
      <EventManagementPageHeader
        title="QR 출력"
        eventTitle={detail.title}
        description="경기장별 채점/주심 QR과 관람객 QR을 생성하고 인쇄합니다. 심판 QR 접속 후 이름과 생년월일을 입력하세요."
      />

      <EventQrPrintBoard
        eventId={eventId}
        eventTitle={detail.title}
        eventDate={detail.eventDate}
        eventLocation={detail.locationName ?? detail.location}
        eventStatus={detail.status}
        publicSlug={detail.publicSlug}
        liveStreamingEnabled={detail.liveStreamingEnabled}
        publicLiveStreamCount={publicLiveStreamCount}
        spectatorAccessEnabled={detail.spectatorAccessEnabled}
        spectatorAccessStartAt={detail.spectatorAccessStartAt}
        spectatorAccessEndAt={detail.spectatorAccessEndAt}
        baseUrl={baseUrl}
        courts={courtQrLinks}
      />
    </EventManagementLayout>
  );
}
