"use client";

import { Fragment } from "react";
import { OperationJudgeBriefCell } from "@/components/domain/operation/OperationJudgeBriefCell";
import { OperationMatchFighterMatchup } from "@/components/domain/operation/OperationMatchFighterMatchup";
import { extractDisplayResultMemo } from "@/lib/match-result-memo";
import { OrganizerMatchOpsPanel } from "@/components/domain/brackets/OrganizerMatchOpsPanel";
import { OrganizerJudgeAggregationInlineSection } from "@/components/domain/judges/OrganizerJudgeAggregationInlineSection";
import { MatchFinalResultSummary } from "@/components/domain/operation/MatchFinalResultSummary";
import { OrganizerOperationActions } from "@/components/domain/operation/OrganizerOperationActions";
import { OrganizerOperationStatusBadges } from "@/components/domain/operation/OrganizerOperationStatusBadges";
import { DivisionCompactDisplay } from "@/components/domain/shared/DivisionCompactDisplay";
import type { OperationMatchRowVM } from "@/components/domain/operation/operation-match-row";
import { getOperationMatchPhase } from "@/lib/match-operation-display";
import { toMatchOpsProps } from "@/components/domain/operation/operation-match-row";

export function OrganizerOperationTableDesktop({
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
      <p className="text-muted-foreground rounded-xl border px-4 py-8 text-center text-sm">
        표시할 경기가 없습니다.
      </p>
    );
  }

  return (
    <div className="hidden overflow-x-auto rounded-xl border md:block">
      <table className="w-full min-w-[1050px] text-left text-sm">
        <thead className="bg-muted/50 border-b text-xs">
          <tr>
            <th className="px-3 py-2 font-medium">순서</th>
            <th className="px-3 py-2 font-medium">경기장</th>
            <th className="px-3 py-2 font-medium">경기구분/체급</th>
            <th className="px-3 py-2 font-medium">대진</th>
            <th className="px-3 py-2 font-medium">경기 상태</th>
            <th className="px-3 py-2 font-medium">심판 결과</th>
            <th className="px-3 py-2 font-medium">메모</th>
            <th className="px-3 py-2 font-medium">액션</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const displayMemo = extractDisplayResultMemo(row.resultMemo);
            return (
            <Fragment key={row.matchId}>
              <tr className="border-b align-middle">
                <td className="px-3 py-3 align-middle font-mono text-xs">
                  {row.orderLabel}
                </td>
                <td className="px-3 py-3 align-middle text-xs">
                  {row.courtName ? (
                    <>
                      <div className="font-medium">{row.courtName}</div>
                      {row.courtOrder != null ? (
                        <div className="text-muted-foreground">{row.courtOrder}경기</div>
                      ) : null}
                    </>
                  ) : (
                    <span className="text-muted-foreground">미지정</span>
                  )}
                </td>
                <td className="px-3 py-3 align-middle text-xs">
                  {row.division ? (
                    <DivisionCompactDisplay
                      division={row.division}
                      mainClassName="text-xs"
                      secondaryClassName="text-[11px]"
                    />
                  ) : (
                    <div className="font-medium">{row.divisionLabel ?? "—"}</div>
                  )}
                </td>
                <td className="px-3 py-3 align-middle">
                  <OperationMatchFighterMatchup
                    fighterRed={row.fighterRed}
                    fighterBlue={row.fighterBlue}
                    winnerId={row.winnerId}
                  />
                </td>
                <td className="px-3 py-3 align-middle">
                  <OrganizerOperationStatusBadges
                    phase={getOperationMatchPhase(row)}
                    phaseLabel={row.phaseLabel}
                    resultStatusLabel={row.resultStatusLabel}
                  />
                </td>
                <td className="px-3 py-3 align-middle text-xs">
                  <OperationJudgeBriefCell
                    matchId={row.matchId}
                    items={judgeBriefByMatch[row.matchId] ?? []}
                  />
                </td>
                <td className="text-muted-foreground max-w-[10rem] px-3 py-3 align-middle text-xs">
                  {displayMemo || "—"}
                </td>
                <td className="px-3 py-3 align-middle">
                  <OrganizerOperationActions
                    match={row}
                    compact
                    onOpenResult={() => onTogglePanel(row)}
                    onOpenView={() => onTogglePanel(row)}
                  />
                </td>
              </tr>
              {expandedMatchId === row.matchId ? (
                <tr className="border-b bg-muted/10">
                  <td colSpan={8} className="px-3 py-3">
                    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.75fr)_minmax(0,1.1fr)]">
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
                      <section className="border-t pt-3 xl:border-l xl:border-t-0 xl:pl-3 xl:pt-0">
                        <h3 className="mb-2 text-sm font-semibold">주심 입력</h3>
                        <OrganizerMatchOpsPanel
                          {...toMatchOpsProps(row)}
                          compact
                        />
                      </section>
                    </div>
                  </td>
                </tr>
              ) : null}
            </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
