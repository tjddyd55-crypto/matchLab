"use client";

import { OperationJudgeBriefCell } from "@/components/domain/operation/OperationJudgeBriefCell";
import { MatchFinalResultSummary } from "@/components/domain/operation/MatchFinalResultSummary";
import { OrganizerOperationActions } from "@/components/domain/operation/OrganizerOperationActions";
import { OrganizerOperationStatusBadges } from "@/components/domain/operation/OrganizerOperationStatusBadges";
import { OrganizerJudgeAggregationInlineSection } from "@/components/domain/judges/OrganizerJudgeAggregationInlineSection";
import { DivisionCompactDisplay } from "@/components/domain/shared/DivisionCompactDisplay";
import type { OperationMatchRowVM } from "@/components/domain/operation/operation-match-row";
import {
  getOperationMatchListDisplay,
  getOperationMatchListResultClassName,
} from "@/lib/operation-match-list-display";
import { getOperationMatchPhase } from "@/lib/match-operation-display";
import { operationExpandedMobileCardClass } from "@/lib/ui/list-table-styles";
import { cn } from "@/lib/utils";

export function OrganizerOperationCardListMobile({
  rows,
  expandedMatchId,
  onTogglePanel,
  judgeBriefByMatch = {},
}: {
  rows: OperationMatchRowVM[];
  expandedMatchId: string | null;
  onTogglePanel: (row: OperationMatchRowVM) => void;
  judgeBriefByMatch?: Record<string, { judgeName: string; winnerCorner: string }[]>;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground rounded-xl border px-4 py-8 text-center text-sm md:hidden">
        표시할 경기가 없습니다.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2 md:hidden">
      {rows.map((row) => {
        const isExpanded = expandedMatchId === row.matchId;
        const display = getOperationMatchListDisplay(row);

        return (
          <article
            key={row.matchId}
            className={cn(
              operationExpandedMobileCardClass(isExpanded),
              "space-y-2 p-3",
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-semibold leading-tight text-matchon-text-primary">
                  {display.matchNumberLabel}
                  {display.courtLabel ? (
                    <span className="text-matchon-text-secondary ml-1 text-[12px] font-normal">
                      · {display.courtLabel}
                    </span>
                  ) : null}
                </p>
                {row.division ? (
                  <DivisionCompactDisplay
                    division={row.division}
                    mainClassName="text-[11px] leading-tight"
                    secondaryClassName="text-[10px]"
                  />
                ) : (
                  <p className="text-[11px] font-medium">
                    {row.divisionLabel ?? "경기구분 미상"}
                  </p>
                )}
              </div>
              <OrganizerOperationStatusBadges
                phase={getOperationMatchPhase(row)}
                phaseLabel={row.phaseLabel}
                resultStatusLabel={row.resultStatusLabel}
                status={row.status}
                size="sm"
              />
            </div>

            <p
              className={cn(
                "truncate text-sm font-semibold leading-snug",
                display.isFinished && "text-slate-600",
              )}
              title={display.matchupLabel}
            >
              {display.matchupLabel}
            </p>
            <p className={getOperationMatchListResultClassName(display)}>
              {display.resultLabel}
            </p>

            <OperationJudgeBriefCell
              matchId={row.matchId}
              items={judgeBriefByMatch[row.matchId] ?? []}
            />

            <OrganizerOperationActions
              match={row}
              onOpenResult={() => onTogglePanel(row)}
              onOpenView={() => onTogglePanel(row)}
            />

            {isExpanded ? (
              <div className="space-y-3 border-t border-primary/20 pt-3">
                <OrganizerJudgeAggregationInlineSection
                  matchId={row.matchId}
                  open
                />
                <MatchFinalResultSummary
                  status={row.status}
                  winnerId={row.winnerId}
                  resultType={row.resultType}
                  hasOfficialResults={row.hasOfficialResults}
                  fighterRedId={row.fighterRed?.id ?? null}
                  fighterBlueId={row.fighterBlue?.id ?? null}
                  fighterRedName={row.fighterRed?.name ?? "미배정"}
                  fighterBlueName={row.fighterBlue?.name ?? "미배정"}
                />
                <p className="text-muted-foreground text-xs">
                  결과 입력·상태 변경은 아래 선택 경기 패널에서 진행합니다.
                </p>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
