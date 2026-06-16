import { requireActor } from "@/lib/auth/actor";
import { requireOrganizerForEventPage } from "@/lib/permissions";
import { eventCourtService } from "@/lib/services/event-court.service";
import { formatDivisionNameLabel } from "@/lib/bracket-snapshot";
import { eventService } from "@/lib/services/event.service";
import { matchService } from "@/lib/services/match.service";
import { EventCourtManager } from "@/components/domain/courts/EventCourtManager";
import { OrganizerCourtBracketPanel } from "@/components/domain/courts/OrganizerCourtBracketPanel";

export async function OrganizerCourtsSection({
  eventId,
}: {
  eventId: string;
}) {
  const actor = await requireActor();
  await requireOrganizerForEventPage(actor, eventId);

  const [courts, divisions, eventMatches] = await Promise.all([
    eventCourtService.listForOrganizer(actor, eventId),
    eventService.listOrganizerEventDivisions(actor, eventId),
    matchService.listOrganizerEventMatches(actor, eventId),
  ]);

  const activeCourts = courts.filter((c) => c.isActive);

  const divisionOptions = divisions.map((d) => ({
    id: d.id,
    label: formatDivisionNameLabel(d),
    weightClass: d.weightClass,
  }));

  return (
    <section id="event-courts" className="flex flex-col gap-8">
      <div>
        <h2 className="text-lg font-semibold">경기장 · 전체순서</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          경기장을 추가·배정하고, 경기장별 대진표와 순서를 이 화면에서 바로
          관리합니다.
        </p>
      </div>

      <EventCourtManager
        eventId={eventId}
        courts={courts}
        divisionOptions={divisionOptions}
      />

      {activeCourts.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed px-4 py-6 text-center text-sm">
          경기장을 먼저 추가하세요. 추가 후 경기장별 대진·순서를 설정할 수 있습니다.
        </p>
      ) : eventMatches.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed px-4 py-6 text-center text-sm">
          정렬할 경기가 없습니다. 대진표에 경기를 생성한 뒤 순서를 지정할 수 있습니다.
        </p>
      ) : (
        <OrganizerCourtBracketPanel
          eventId={eventId}
          courts={activeCourts}
          matches={eventMatches}
        />
      )}
    </section>
  );
}
