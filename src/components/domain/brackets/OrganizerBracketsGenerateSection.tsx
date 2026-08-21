import { requireActor } from "@/lib/auth/actor";
import { requireOrganizerForEventPage } from "@/lib/permissions";
import { AutoBracketGenerationPanel } from "@/components/domain/brackets/AutoBracketGenerationPanel";
import { BracketResetPanel } from "@/components/domain/brackets/BracketResetPanel";
import { bracketAutoMatchService } from "@/lib/services/bracket-auto-match.service";
import { bracketService } from "@/lib/services/bracket.service";
import { eventService } from "@/lib/services/event.service";
import { BracketCreateForm } from "@/components/domain/brackets/BracketCreateForm";
import { OrganizerBracketList } from "@/components/domain/brackets/OrganizerBracketList";
import { UnmatchedBracketCandidatesPanel } from "@/components/domain/brackets/UnmatchedBracketCandidatesPanel";
import { BracketsEmptyState } from "@/components/domain/brackets/BracketsEmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { eventCourtService } from "@/lib/services/event-court.service";

/** 대진표 생성 탭 콘텐츠 */
export async function OrganizerBracketsGenerateSection({
  eventId,
}: {
  eventId: string;
}) {
  const actor = await requireActor();
  await requireOrganizerForEventPage(actor, eventId);

  const [brackets, divisions, unmatchedCandidates, resetCheck, courts] =
    await Promise.all([
      bracketService.listOrganizerEventBrackets(actor, eventId),
      eventService.listOrganizerEventDivisions(actor, eventId),
      bracketAutoMatchService.listUnmatchedCandidatesForEvent(actor, eventId),
      bracketAutoMatchService.canResetBracketSafely(actor, eventId),
      eventCourtService.listForOrganizer(actor, eventId),
    ]);

  return (
    <div className="flex flex-col gap-8">
      <BracketResetPanel
        eventId={eventId}
        canResetSafely={resetCheck.safe}
        matchesWithResults={resetCheck.matchesWithResults}
      />

      <AutoBracketGenerationPanel
        eventId={eventId}
        courts={courts}
        canResetSafely={resetCheck.safe}
        matchesWithResults={resetCheck.matchesWithResults}
      />

      <BracketCreateForm eventId={eventId} divisions={divisions} />

      <Card variant="default" className="py-4">
        <CardHeader className="px-4 pb-2">
          <CardTitle className="text-lg">대진표 그룹</CardTitle>
          <p className="text-muted-foreground mt-1 text-sm font-normal">
            그룹명·공개 여부를 관리하고 상세 화면에서 경기를 수정·삭제할 수 있습니다.
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

      <UnmatchedBracketCandidatesPanel candidates={unmatchedCandidates} />
    </div>
  );
}
