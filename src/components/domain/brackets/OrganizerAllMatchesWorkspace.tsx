import { requireActor } from "@/lib/auth/actor";
import { requireOrganizerForEventPage } from "@/lib/permissions";
import { bracketService } from "@/lib/services/bracket.service";
import { eventCourtService } from "@/lib/services/event-court.service";
import { applicationService } from "@/lib/services/application.service";
import { OrganizerAllMatchesWorkspaceClient } from "@/components/domain/brackets/OrganizerAllMatchesWorkspaceClient";

/** 대진표 보기 → 전체 경기 편집 서브탭 (서버 로드) */
export async function OrganizerAllMatchesWorkspace({
  eventId,
}: {
  eventId: string;
}) {
  const actor = await requireActor();
  await requireOrganizerForEventPage(actor, eventId);

  const [data, courts, manualRegistrationOptions] = await Promise.all([
    bracketService.getOrganizerEventAllMatchesWorkspace(actor, eventId),
    eventCourtService.listForOrganizer(actor, eventId),
    applicationService.getOrganizerManualRegistrationOptions(actor, eventId),
  ]);

  return (
    <OrganizerAllMatchesWorkspaceClient
      eventId={eventId}
      data={data}
      courts={courts}
      manualRegistrationOptions={manualRegistrationOptions}
    />
  );
}
