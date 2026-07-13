import { requireActor } from "@/lib/auth/actor";
import { requireOrganizerForEventPage } from "@/lib/permissions";
import { applicationService } from "@/lib/services/application.service";
import { OrganizerApplicationsBoard } from "@/components/domain/applications/OrganizerApplicationsBoard";
import { EventManagementLayout } from "@/components/domain/events/EventManagementLayout";
import { EventManagementPageHeader } from "@/components/domain/events/EventManagementPageHeader";
import { loadEventManagementNavContext, eventManagementLayoutProps } from "@/lib/event-management-nav-context";

export const dynamic = "force-dynamic";

export default async function OrganizerEventApplicationsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const actor = await requireActor();
  const { eventId } = await params;

  await requireOrganizerForEventPage(actor, eventId);

  const [nav, rows, manualRegistrationOptions] = await Promise.all([
    loadEventManagementNavContext(eventId),
    applicationService.listOrganizerEventApplications(actor, eventId),
    applicationService.getOrganizerManualRegistrationOptions(actor, eventId),
  ]);

  return (
    <EventManagementLayout {...eventManagementLayoutProps(nav)}>
      <EventManagementPageHeader
        title="신청자 관리"
        eventTitle={nav.title}
        description="입금 상태는 결제 행을 진실 원천으로 두며, 목록의 입금 상태는 동기화된 캐시입니다."
      />

      <OrganizerApplicationsBoard
        eventId={eventId}
        rows={rows}
        manualRegistrationOptions={manualRegistrationOptions}
      />
    </EventManagementLayout>
  );
}
