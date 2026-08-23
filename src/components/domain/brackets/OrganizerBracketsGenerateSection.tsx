import { requireActor } from "@/lib/auth/actor";
import { requireOrganizerForEventPage } from "@/lib/permissions";
import { BracketResetPanel } from "@/components/domain/brackets/BracketResetPanel";
import { OrganizerBracketsGenerateActions } from "@/components/domain/brackets/OrganizerBracketsGenerateActions";
import { bracketAutoMatchService } from "@/lib/services/bracket-auto-match.service";
import { bracketService } from "@/lib/services/bracket.service";
import { eventService } from "@/lib/services/event.service";
import { OrganizerBracketList } from "@/components/domain/brackets/OrganizerBracketList";
import { UnmatchedBracketCandidatesPanel } from "@/components/domain/brackets/UnmatchedBracketCandidatesPanel";
import { BracketsEmptyState } from "@/components/domain/brackets/BracketsEmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { eventCourtService } from "@/lib/services/event-court.service";
import { applicationRepository } from "@/lib/repositories/application.repository";

/** 대진표 생성 탭 — 그룹 목록 우선, 자동매칭/그룹생성은 모달 */
export async function OrganizerBracketsGenerateSection({
  eventId,
}: {
  eventId: string;
}) {
  const actor = await requireActor();
  await requireOrganizerForEventPage(actor, eventId);

  const [brackets, divisions, unmatchedCandidates, resetCheck, courts, undividedCount] =
    await Promise.all([
      bracketService.listOrganizerEventBrackets(actor, eventId),
      eventService.listOrganizerEventDivisions(actor, eventId),
      bracketAutoMatchService.listUnmatchedCandidatesForEvent(actor, eventId),
      bracketAutoMatchService.canResetBracketSafely(actor, eventId),
      eventCourtService.listForOrganizer(actor, eventId),
      applicationRepository.countApplicationsWithoutDivision(eventId),
    ]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">대진표</h2>
        <OrganizerBracketsGenerateActions
          eventId={eventId}
          courts={courts}
          canResetSafely={resetCheck.safe}
          matchesWithResults={resetCheck.matchesWithResults}
          undividedApplicantCount={undividedCount}
          divisions={divisions}
        />
      </div>

      <Card variant="default" className="py-4">
        <CardHeader className="px-4 pb-2">
          <CardTitle className="text-lg">대진표 그룹</CardTitle>
          <p className="text-muted-foreground mt-1 text-sm font-normal">
            그룹을 열어 잡힌 경기와 미매칭 선수를 한 화면에서 운영합니다.
          </p>
        </CardHeader>
        <CardContent className="px-4">
          {brackets.length === 0 ? (
            <BracketsEmptyState message="신청자가 있는 경기구분·체급이 아직 없습니다." />
          ) : (
            <div className="overflow-x-auto">
              <OrganizerBracketList eventId={eventId} brackets={brackets} />
            </div>
          )}
        </CardContent>
      </Card>

      <BracketResetPanel
        eventId={eventId}
        canResetSafely={resetCheck.safe}
        matchesWithResults={resetCheck.matchesWithResults}
      />

      <UnmatchedBracketCandidatesPanel candidates={unmatchedCandidates} />
    </div>
  );
}
