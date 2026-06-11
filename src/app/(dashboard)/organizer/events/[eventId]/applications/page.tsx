import { requireActor } from "@/lib/auth/actor";
import { requireOrganizerForEventPage } from "@/lib/permissions";
import { applicationService } from "@/lib/services/application.service";
import { creditService } from "@/lib/services/credit.service";
import { eventRepository } from "@/lib/repositories/event.repository";
import { OrganizerApplicationsBoard } from "@/components/domain/applications/OrganizerApplicationsBoard";
import { OrganizerEventCreditNotice } from "@/components/domain/credits/OrganizerEventCreditNotice";
import { EventManagementLayout } from "@/components/domain/events/EventManagementLayout";
import { EventManagementPageHeader } from "@/components/domain/events/EventManagementPageHeader";
import { loadEventManagementNavContext } from "@/lib/event-management-nav-context";
import { ApplicationStatus } from "@/lib/enums";

export const dynamic = "force-dynamic";

export default async function OrganizerEventApplicationsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const actor = await requireActor();
  const { eventId } = await params;

  await requireOrganizerForEventPage(actor, eventId);

  const [nav, rows] = await Promise.all([
    loadEventManagementNavContext(eventId),
    applicationService.listOrganizerEventApplications(actor, eventId),
  ]);

  const organizerId =
    actor.organizerId ??
    (await eventRepository.findEventOrganizerId(eventId));
  const pendingCount = rows.filter(
    (r) => r.applicationStatus === ApplicationStatus.pending,
  ).length;
  const creditCtx =
    organizerId != null
      ? await creditService.getEventApprovalCreditContext(
          organizerId,
          pendingCount,
        )
      : null;

  return (
    <EventManagementLayout eventId={nav.eventId} publicSlug={nav.publicSlug}>
      <EventManagementPageHeader
        title="신청자 관리"
        eventTitle={nav.title}
        description="입금 상태는 결제 행을 진실 원천으로 두며, 목록의 입금 상태는 동기화된 캐시입니다."
      />

      {creditCtx ? <OrganizerEventCreditNotice credit={creditCtx} /> : null}

      <OrganizerApplicationsBoard eventId={eventId} rows={rows} />
    </EventManagementLayout>
  );
}
