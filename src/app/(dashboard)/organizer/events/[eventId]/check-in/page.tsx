import { requireActor } from "@/lib/auth/actor";
import {
  requireOrganizerForEventPage,
  resolveOrganizerEventPageError,
} from "@/lib/permissions";
import { fieldStatusService } from "@/lib/services/field-status.service";
import { OrganizerFieldStatusBoard } from "@/components/domain/field-status/OrganizerFieldStatusBoard";
import { OrganizerWeighInSheetActions } from "@/components/domain/weigh-in/OrganizerWeighInSheetActions";
import { EventManagementLayout } from "@/components/domain/events/EventManagementLayout";
import { EventManagementPageHeader } from "@/components/domain/events/EventManagementPageHeader";
import {
  loadEventManagementNavContext,
  eventManagementLayoutProps,
} from "@/lib/event-management-nav-context";

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
        title="현장 계체"
        eventTitle={nav.title}
        description="승인된 신청자의 계체·경기 진행·실격·출전 상태를 관리합니다. 계체 통과 또는 계체 실패 후 핸디캡 경기 진행 시 출전 확정됩니다."
      >
        <OrganizerWeighInSheetActions eventId={eventId} />
      </EventManagementPageHeader>

      <OrganizerFieldStatusBoard
        rows={fieldStatus.rows}
        summary={fieldStatus.summary}
        eventId={eventId}
      />
    </EventManagementLayout>
  );
}
