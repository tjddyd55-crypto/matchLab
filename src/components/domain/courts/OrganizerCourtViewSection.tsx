import { BracketsEmptyState } from "@/components/domain/brackets/BracketsEmptyState";
import { OrganizerBracketPrintActions } from "@/components/domain/brackets/OrganizerBracketPrintActions";
import { OrganizerJudgeScoreSheetActions } from "@/components/domain/judge-score-sheet/OrganizerJudgeScoreSheetActions";
import { OrganizerCourtBracketPanel } from "@/components/domain/courts/OrganizerCourtBracketPanel";
import { requireActor } from "@/lib/auth/actor";
import { requireOrganizerForEventPage } from "@/lib/permissions";
import { eventCourtService } from "@/lib/services/event-court.service";
import { matchService } from "@/lib/services/match.service";

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
    <section id="event-courts" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">경기장별 대진표</h2>
        {eventMatches.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <OrganizerBracketPrintActions eventId={eventId} variant="view" />
            <OrganizerJudgeScoreSheetActions eventId={eventId} />
          </div>
        ) : null}
      </div>

      {activeCourts.length === 0 ? (
        <BracketsEmptyState message="경기장을 먼저 추가하세요. 대진표 생성 탭에서 경기장을 만들 수 있습니다." />
      ) : eventMatches.length === 0 ? (
        <BracketsEmptyState message="아직 생성된 대진표가 없습니다. 대진표 생성 탭에서 경기를 만든 뒤 순서를 지정할 수 있습니다." />
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
