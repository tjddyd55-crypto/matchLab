import { requireActor } from "@/lib/auth/actor";
import { requireOrganizerForEventPage } from "@/lib/permissions";
import { eventCourtService } from "@/lib/services/event-court.service";
import { matchService } from "@/lib/services/match.service";
import { OrganizerCourtBracketPanel } from "@/components/domain/courts/OrganizerCourtBracketPanel";

/** 대진표 보기 탭 — 경기장별 대진·순서 조정 */
export async function OrganizerCourtViewSection({
  eventId,
}: {
  eventId: string;
}) {
  const actor = await requireActor();
  await requireOrganizerForEventPage(actor, eventId);

  const [courts, eventMatches] = await Promise.all([
    eventCourtService.listForOrganizer(actor, eventId),
    matchService.listOrganizerEventMatches(actor, eventId),
  ]);

  const activeCourts = courts.filter((c) => c.isActive);

  return (
    <section id="event-courts" className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">경기장별 대진표</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          경기장별로 전체 경기를 확인하고 순서·경기장 배정을 조정합니다.
        </p>
      </div>

      {activeCourts.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed px-4 py-6 text-center text-sm">
          경기장을 먼저 추가하세요. 대진표 생성 탭에서 경기장을 만들 수 있습니다.
        </p>
      ) : eventMatches.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed px-4 py-6 text-center text-sm">
          표시할 경기가 없습니다. 대진표 생성 탭에서 경기를 만든 뒤 순서를 지정할 수 있습니다.
        </p>
      ) : (
        <OrganizerCourtBracketPanel
          eventId={eventId}
          courts={courts}
          matches={eventMatches}
        />
      )}
    </section>
  );
}
