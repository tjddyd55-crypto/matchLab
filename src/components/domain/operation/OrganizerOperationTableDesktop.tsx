"use client";

import { Fragment } from "react";
import { OperationJudgeBriefCell } from "@/components/domain/operation/OperationJudgeBriefCell";
import { BoutFormatBadge } from "@/components/domain/shared/BoutFormatBadge";
import { parseMatchOperationalSettings } from "@/lib/match-operational-settings";
import { OrganizerMatchOpsPanel } from "@/components/domain/brackets/OrganizerMatchOpsPanel";
import { OrganizerJudgeAggregationInlineSection } from "@/components/domain/judges/OrganizerJudgeAggregationInlineSection";
import { OrganizerOperationActions } from "@/components/domain/operation/OrganizerOperationActions";
import { OrganizerOperationStatusBadges } from "@/components/domain/operation/OrganizerOperationStatusBadges";
import { FighterHandicapBadge } from "@/components/domain/shared/FighterHandicapBadge";
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
      <table className="w-full min-w-[1100px] text-left text-sm">
        <thead className="bg-muted/50 border-b text-xs">
          <tr>
            <th className="px-3 py-2 font-medium">순서</th>
            <th className="px-3 py-2 font-medium">경기장</th>
            <th className="px-3 py-2 font-medium">경기구분/체급</th>
            <th className="px-3 py-2 font-medium">선수 A</th>
            <th className="px-3 py-2 font-medium">선수 B</th>
            <th className="px-3 py-2 font-medium">경기 상태</th>
            <th className="px-3 py-2 font-medium">심판 결과</th>
            <th className="px-3 py-2 font-medium">메모</th>
            <th className="px-3 py-2 font-medium">액션</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const displayMemo = parseMatchOperationalSettings(row.resultMemo).displayMemo;
            return (
            <Fragment key={row.matchId}>
              <tr className="border-b align-top">
                <td className="px-3 py-3 font-mono text-xs">{row.orderLabel}</td>
                <td className="px-3 py-3 text-xs">
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
                <td className="px-3 py-3 text-xs">
                  <div className="font-medium">{row.divisionLabel ?? "—"}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <BoutFormatBadge
                      bracketType={row.bracketType}
                      bracketIsPublic={row.bracketIsPublic}
                    />
                  </div>
                  <div className="text-muted-foreground mt-1">{row.bracketTitle}</div>
                </td>
                <td className="px-3 py-3 text-xs">
                  <div className="font-medium">{row.fighterRed?.name ?? "—"}</div>
                  <div className="text-muted-foreground">{row.fighterRed?.gymName ?? "—"}</div>
                  <FighterHandicapBadge
                    handicap={row.fighterRed?.handicap}
                    cornerLabel="홍코너"
                    compact
                    className="mt-1"
                  />
                </td>
                <td className="px-3 py-3 text-xs">
                  <div className="font-medium">{row.fighterBlue?.name ?? "—"}</div>
                  <div className="text-muted-foreground">{row.fighterBlue?.gymName ?? "—"}</div>
                  <FighterHandicapBadge
                    handicap={row.fighterBlue?.handicap}
                    cornerLabel="청코너"
                    compact
                    className="mt-1"
                  />
                </td>
                <td className="px-3 py-3">
                  <OrganizerOperationStatusBadges
                    phase={getOperationMatchPhase(row)}
                    phaseLabel={row.phaseLabel}
                    resultStatusLabel={row.resultStatusLabel}
                  />
                </td>
                <td className="px-3 py-3 text-xs">
                  <OperationJudgeBriefCell
                    matchId={row.matchId}
                    items={judgeBriefByMatch[row.matchId] ?? []}
                  />
                </td>
                <td className="text-muted-foreground max-w-[10rem] px-3 py-3 text-xs">
                  {displayMemo || "—"}
                </td>
                <td className="px-3 py-3">
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
                  <td colSpan={9} className="px-3 py-3">
                    <div className="grid gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)]">
                      <OrganizerMatchOpsPanel
                        {...toMatchOpsProps(row)}
                        compact
                      />
                      <OrganizerJudgeAggregationInlineSection
                        matchId={row.matchId}
                        open
                      />
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
