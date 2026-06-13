import { EventManagementLayout } from "@/components/domain/events/EventManagementLayout";
import { EventManagementPageHeader } from "@/components/domain/events/EventManagementPageHeader";
import { EventQrPrintBoard } from "@/components/domain/events/qr/EventQrPrintBoard";
import { requireActor } from "@/lib/auth/actor";
import { requireOrganizerForEventPage, resolveOrganizerEventPageError } from "@/lib/permissions";
import { loadEventManagementNavContext } from "@/lib/event-management-nav-context";
import { eventService } from "@/lib/services/event.service";
import { judgeCredentialService } from "@/lib/services/judge-credential.service";
import { getServerAppBaseUrl } from "@/lib/qr-url";
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

  const [nav, credentials, headersList] = await Promise.all([
    loadEventManagementNavContext(eventId),
    judgeCredentialService.listForOrganizer(actor, eventId),
    headers(),
  ]);

  const baseUrl = getServerAppBaseUrl(headersList);
  const publicLiveStreamCount = detail.publicSlug
    ? (await liveStreamService.listPublicForEventSlug(detail.publicSlug)).length
    : 0;

  return (
    <EventManagementLayout eventId={nav.eventId} publicSlug={nav.publicSlug}>
      <EventManagementPageHeader
        title="QR 출력"
        eventTitle={detail.title}
        description="현장 부착용 심판·관람객 QR을 생성하고 인쇄합니다. QR에는 비밀번호·세션·secret을 넣지 않습니다."
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
        credentials={credentials}
      />
    </EventManagementLayout>
  );
}
