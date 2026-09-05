import { EventManagementLayout } from "@/components/domain/events/EventManagementLayout";
import { EventManagementPageHeader } from "@/components/domain/events/EventManagementPageHeader";
import { EventQrPageNav } from "@/components/domain/events/qr/EventQrPageNav";
import { EventQrPrintBoard } from "@/components/domain/events/qr/EventQrPrintBoard";
import { OnsiteOpsLinkManager } from "@/components/domain/onsite-ops/OnsiteOpsLinkManager";
import { requireActor } from "@/lib/auth/actor";
import { requireOrganizerForEventPage, resolveOrganizerEventPageError } from "@/lib/permissions";
import { loadEventManagementNavContext, eventManagementLayoutProps } from "@/lib/event-management-nav-context";
import { eventService } from "@/lib/services/event.service";
import { eventCourtService } from "@/lib/services/event-court.service";
import { getServerAppBaseUrl } from "@/lib/qr-url";
import { buildCourtJudgeQrLinks } from "@/lib/services/judge-qr-entry.service";
import { onsiteOpsAccessService } from "@/lib/services/onsite-ops-access.service";
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

  const [nav, courts, headersList, onsiteOpsLink] = await Promise.all([
    loadEventManagementNavContext(eventId),
    eventCourtService.listForOrganizer(actor, eventId),
    headers(),
    onsiteOpsAccessService.getOwnerLink(actor, eventId),
  ]);

  const baseUrl = getServerAppBaseUrl(headersList);
  const activeCourts = courts.filter((c) => c.isActive);
  const courtQrLinks = buildCourtJudgeQrLinks(eventId, activeCourts, baseUrl);
  const publicLiveStreamCount = detail.publicSlug
    ? (await liveStreamService.listPublicForEventSlug(detail.publicSlug)).length
    : 0;

  return (
    <EventManagementLayout {...eventManagementLayoutProps(nav)}>
      <EventManagementPageHeader
        title="QR 출력"
        eventTitle={detail.title}
        description="공개 대회 QR, 채점심판 QR, 운영관리 QR을 생성·복사·인쇄합니다."
      />

      <EventQrPageNav />

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

      <div className="mt-8 border-t pt-6">
        <OnsiteOpsLinkManager
          eventId={eventId}
          baseUrl={baseUrl}
          initialLink={onsiteOpsLink}
        />
      </div>
    </EventManagementLayout>
  );
}
