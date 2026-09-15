import { notFound } from "next/navigation";
import { EventManagementLayout } from "@/components/domain/events/EventManagementLayout";
import { EventManagementPageHeader } from "@/components/domain/events/EventManagementPageHeader";
import { OrganizerPublicNoticeLinkActions } from "@/components/domain/events/OrganizerPublicNoticeLinkActions";
import { PublicEventAnnouncementContent } from "@/components/domain/events/public/PublicEventAnnouncementContent";
import { requireActor } from "@/lib/auth/actor";
import {
  eventManagementLayoutProps,
  loadEventManagementNavContext,
} from "@/lib/event-management-nav-context";
import { resolveOrganizerEventPageError } from "@/lib/permissions";
import { eventService } from "@/lib/services/event.service";

export const dynamic = "force-dynamic";

export default async function OrganizerEventPublicNoticePage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const actor = await requireActor();
  const { eventId } = await params;

  let detail;
  try {
    detail = await eventService.getOrganizerEventDetail(actor, eventId);
  } catch (e) {
    resolveOrganizerEventPageError(e);
  }

  if (!detail.publicSlug) {
    notFound();
  }

  const [nav, publicEvent] = await Promise.all([
    loadEventManagementNavContext(eventId),
    eventService.getPublicEventBySlug(detail.publicSlug),
  ]);

  if (!publicEvent) {
    notFound();
  }

  return (
    <EventManagementLayout {...eventManagementLayoutProps(nav)}>
      <EventManagementPageHeader
        title="대회 공개 공고"
        description="참가자에게 공개되는 공고 페이지 미리보기입니다."
      >
        <OrganizerPublicNoticeLinkActions publicSlug={detail.publicSlug} />
      </EventManagementPageHeader>

      <PublicEventAnnouncementContent event={publicEvent} variant="embedded" />
    </EventManagementLayout>
  );
}
