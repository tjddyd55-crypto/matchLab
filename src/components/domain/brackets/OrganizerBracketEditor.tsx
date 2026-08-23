import Link from "next/link";
import { BracketApprovedCandidatesSection } from "@/components/domain/brackets/BracketApprovedCandidatesSection";
import { BracketTypeBadge } from "@/components/domain/brackets/BracketTypeBadge";
import { MatchListEditor } from "@/components/domain/brackets/MatchListEditor";
import { TournamentBracketEditor } from "@/components/domain/brackets/TournamentBracketEditor";
import { DivisionCompactDisplay } from "@/components/domain/shared/DivisionCompactDisplay";
import { formatDivisionMainLabel } from "@/lib/event-division-fields";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

  return `신청 ${applicantCount} · 배정 ${assignedCount} · 경기 ${matchCount} · 미매칭 ${unmatchedCount}`;
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
    <div className="flex w-full flex-col gap-5">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-3">
              <Link
                href={`/organizer/events/${eventId}/brackets`}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "-ml-2",
                )}
              >
                ← 대진표 그룹
              </Link>
              {detail.division ? (
                <DivisionCompactDisplay
                  division={detail.division}
                  mainClassName="font-heading text-2xl font-semibold tracking-tight"
                />
              ) : (
                <CardTitle className="font-heading text-2xl">
                  {detail.displayTitle}
                </CardTitle>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <BracketTypeBadge type={detail.type} />
                <span className="text-muted-foreground text-xs">
                  전체 대진표: {eventBracketsPublic ? "공개" : "비공개"}
                </span>
              </div>
              <p className="text-muted-foreground text-sm">{summaryLine}</p>
              <CardDescription>
                공개 여부는{" "}
                <Link
                  href={`/organizer/events/${eventId}/brackets?tab=settings`}
                  className="text-foreground underline-offset-2 hover:underline"
                >
                  기본 설정
                </Link>
                에서만 변경할 수 있습니다.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {isMatchList ? (
        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)] lg:items-start lg:gap-5">
          <div className="min-w-0 overflow-x-auto">
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
          <div className="min-w-0">
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
