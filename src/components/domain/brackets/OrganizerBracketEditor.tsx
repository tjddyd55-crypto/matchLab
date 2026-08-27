import Link from "next/link";
import { BracketApprovedCandidatesSection } from "@/components/domain/brackets/BracketApprovedCandidatesSection";
import { BracketTypeBadge } from "@/components/domain/brackets/BracketTypeBadge";
import { MatchListEditor } from "@/components/domain/brackets/MatchListEditor";
import { TournamentBracketEditor } from "@/components/domain/brackets/TournamentBracketEditor";
import { DivisionCompactDisplay } from "@/components/domain/shared/DivisionCompactDisplay";
import { formatDivisionMainLabel } from "@/lib/event-division-fields";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { BracketMatchStatus, BracketType } from "@/lib/enums";
import type { OrganizerBracketDetailVM } from "@/lib/services/bracket.service";
import type { EventCourtVM } from "@/lib/services/event-court.service";
import { cn } from "@/lib/utils";

function buildBracketDetailSummary(detail: OrganizerBracketDetailVM): string {
  const placedIds = new Set<string>();
  for (const m of detail.matches) {
    if (m.status === BracketMatchStatus.cancelled) continue;
    if (m.fighterRedId) placedIds.add(m.fighterRedId);
    if (m.fighterBlueId) placedIds.add(m.fighterBlueId);
  }

  const applicantCount = detail.approvedFighterOptions.length;
  const assignedCount = placedIds.size;
  const matchCount = detail.matches.length;
  const unmatchedCount = detail.approvedFighterOptions.filter(
    (o) => o.isAssignableForBracket && !placedIds.has(o.fighterId),
  ).length;

  return `신청 ${applicantCount} · 배정 ${assignedCount} · 경기 ${matchCount} · 미배정 ${unmatchedCount}`;
}

export function OrganizerBracketEditor({
  eventId,
  detail,
  courts,
  eventBracketsPublic = false,
}: {
  eventId: string;
  detail: OrganizerBracketDetailVM;
  courts: EventCourtVM[];
  /** 대회 단위 대진표 공개 SSOT (기본설정). 그룹별 변경 불가. */
  eventBracketsPublic?: boolean;
}) {
  const summaryLine = buildBracketDetailSummary(detail);
  const isMatchList = detail.type === BracketType.match_list;

  return (
    <div className="flex w-full flex-col gap-3">
      <Card>
        <CardHeader className="space-y-2 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/organizer/events/${eventId}/brackets`}
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "-ml-2 h-8",
              )}
            >
              ← 대진표 그룹
            </Link>
            {detail.division ? (
              <DivisionCompactDisplay
                division={detail.division}
                mainClassName="font-heading text-lg font-semibold tracking-tight sm:text-xl"
              />
            ) : (
              <CardTitle className="font-heading text-lg sm:text-xl">
                {detail.displayTitle}
              </CardTitle>
            )}
            <BracketTypeBadge type={detail.type} />
            <span className="text-muted-foreground text-xs">
              {eventBracketsPublic ? "공개" : "비공개"}
            </span>
          </div>
          <p className="text-muted-foreground text-xs tabular-nums sm:text-sm">
            {summaryLine}
          </p>
        </CardHeader>
      </Card>

      {isMatchList ? (
        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.15fr)] lg:items-stretch lg:gap-5 desktop:grid-cols-[minmax(0,1.6fr)_minmax(0,1.15fr)] desktop:items-stretch desktop:gap-5">
          <div className="flex min-h-0 min-w-0 flex-col">
            <MatchListEditor
              key={detail.syncKey}
              eventId={eventId}
              courts={courts}
              bracketId={detail.id}
              bracketType={detail.type}
              bracketIsPublic={detail.isPublic}
              matches={detail.matches}
              options={detail.approvedFighterOptions}
              compactWorkspace
            />
          </div>
          <div className="flex min-h-0 min-w-0 flex-col">
            <BracketApprovedCandidatesSection
              options={detail.approvedFighterOptions}
              eventWideUnmatchedOptions={detail.eventWideUnmatchedOptions}
              matches={detail.matches}
              bracketId={detail.id}
              bracketType={detail.type}
              defaultCourtId={courts.find((c) => c.isActive)?.id}
              targetDivisionId={detail.divisionId}
              targetDivisionLabel={
                detail.division
                  ? formatDivisionMainLabel(detail.division)
                  : detail.divisionLabel
              }
              targetDivisionGender={detail.division?.gender ?? null}
              variant="workspace"
            />
          </div>
        </div>
      ) : (
        <>
          <BracketApprovedCandidatesSection
            options={detail.approvedFighterOptions}
            eventWideUnmatchedOptions={detail.eventWideUnmatchedOptions}
            matches={detail.matches}
            bracketId={detail.id}
            bracketType={detail.type}
            defaultCourtId={courts.find((c) => c.isActive)?.id}
            targetDivisionId={detail.divisionId}
            targetDivisionLabel={
              detail.division
                ? formatDivisionMainLabel(detail.division)
                : detail.divisionLabel
            }
            targetDivisionGender={detail.division?.gender ?? null}
          />
          <TournamentBracketEditor
            eventId={eventId}
            courts={courts}
            detail={detail}
          />
        </>
      )}
    </div>
  );
}
