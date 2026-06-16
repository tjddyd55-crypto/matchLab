import { requireActor } from "@/lib/auth/actor";
import { requireOrganizerForEventPage } from "@/lib/permissions";
import { eventCourtService } from "@/lib/services/event-court.service";
import { formatDivisionNameLabel } from "@/lib/bracket-snapshot";
import { eventService } from "@/lib/services/event.service";
import { EventCourtManager } from "@/components/domain/courts/EventCourtManager";

/** 대진표 생성 탭 — 경기장 추가·이름·배정 관리 */
export async function OrganizerCourtManagementSection({
  eventId,
}: {
  eventId: string;
}) {
  const actor = await requireActor();
  await requireOrganizerForEventPage(actor, eventId);

  const [courts, divisions] = await Promise.all([
    eventCourtService.listForOrganizer(actor, eventId),
    eventService.listOrganizerEventDivisions(actor, eventId),
  ]);

  const divisionOptions = divisions.map((d) => ({
    id: d.id,
    label: formatDivisionNameLabel(d),
    weightClass: d.weightClass,
  }));

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">경기장 생성·관리</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          경기장을 추가하고 경기구분·체급을 배정합니다. 삭제 대신 비활성 처리합니다.
        </p>
      </div>
      <EventCourtManager
        eventId={eventId}
        courts={courts}
        divisionOptions={divisionOptions}
      />
    </section>
  );
}
