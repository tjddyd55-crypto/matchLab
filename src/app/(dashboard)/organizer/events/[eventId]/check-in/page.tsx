import { requireActor } from "@/lib/auth/actor";
import {
  requireOrganizerForEventPage,
  resolveOrganizerEventPageError,
} from "@/lib/permissions";
import { fieldStatusService } from "@/lib/services/field-status.service";
import { OrganizerFieldStatusBoard } from "@/components/domain/field-status/OrganizerFieldStatusBoard";
import { EventManagementLayout } from "@/components/domain/events/EventManagementLayout";
import { EventManagementPageHeader } from "@/components/domain/events/EventManagementPageHeader";
import { loadEventManagementNavContext, eventManagementLayoutProps } from "@/lib/event-management-nav-context";
export const dynamic = "force-dynamic";

export default async function OrganizerEventCheckInPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const actor = await requireActor();
  const { eventId } = await params;

  try {
    await requireOrganizerForEventPage(actor, eventId);
  } catch (e) {
    resolveOrganizerEventPageError(e);
  }

  const [nav, fieldStatus] = await Promise.all([
    loadEventManagementNavContext(eventId),
    fieldStatusService.listOrganizerEventFieldStatus(actor, eventId),
  ]);

  return (
    <EventManagementLayout {...eventManagementLayoutProps(nav)}>
      <EventManagementPageHeader
        title="현장 확인·계체"
        eventTitle={nav.title}
        description="승인된 신청자에 대해 현장 확인(체크인), 계체, 출전 확정 상태를 기록합니다. 현장 확인은 계체 통과와 별개이며, 출전 확정은 현장 확인 완료와 계체 통과(또는 수동 승인)가 모두 충족될 때 표시됩니다."
      />

      <OrganizerFieldStatusBoard
        rows={fieldStatus.rows}
        summary={fieldStatus.summary}
        eventId={eventId}
      />
    </EventManagementLayout>
  );
}
