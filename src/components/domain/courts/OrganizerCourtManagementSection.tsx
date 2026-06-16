import { requireActor } from "@/lib/auth/actor";
import { requireOrganizerForEventPage } from "@/lib/permissions";
import { eventCourtService } from "@/lib/services/event-court.service";
import { EventCourtManager } from "@/components/domain/courts/EventCourtManager";

/** 기본설정 탭 — 경기장 추가·이름·순서·활성 관리 */
export async function OrganizerCourtManagementSection({
  eventId,
}: {
  eventId: string;
}) {
  const actor = await requireActor();
  await requireOrganizerForEventPage(actor, eventId);

  const courts = await eventCourtService.listForOrganizer(actor, eventId);

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">경기장 생성·관리</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          경기장을 추가하고 이름·순서·활성 상태를 관리합니다. 삭제 대신 비활성 처리합니다.
        </p>
      </div>
      <EventCourtManager eventId={eventId} courts={courts} />
    </section>
  );
}
