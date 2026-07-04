"use client";

import { OrganizerMatchOpsPanel } from "@/components/domain/brackets/OrganizerMatchOpsPanel";
import { OperationJudgeBriefCell } from "@/components/domain/operation/OperationJudgeBriefCell";
import { MatchFinalResultSummary } from "@/components/domain/operation/MatchFinalResultSummary";
import { OrganizerOperationActions } from "@/components/domain/operation/OrganizerOperationActions";
import { OrganizerOperationStatusBadges } from "@/components/domain/operation/OrganizerOperationStatusBadges";
import { OrganizerJudgeAggregationInlineSection } from "@/components/domain/judges/OrganizerJudgeAggregationInlineSection";
import { DivisionCompactDisplay } from "@/components/domain/shared/DivisionCompactDisplay";
import { FighterHandicapBadge } from "@/components/domain/shared/FighterHandicapBadge";
import type { OperationMatchRowVM } from "@/components/domain/operation/operation-match-row";
import {
  getOperationMatchPhase,
} from "@/lib/match-operation-display";
import { toMatchOpsProps } from "@/components/domain/operation/operation-match-row";

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
    <div className="flex flex-col gap-4 md:hidden">
      {rows.map((row) => (
        <article
          key={row.matchId}
          className="ring-foreground/10 space-y-3 rounded-xl border bg-card p-4 shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-muted-foreground text-xs">
                경기 {row.orderLabel}
              </p>
              {row.division ? (
                <DivisionCompactDisplay
                  division={row.division}
                  mainClassName="text-xs"
                  secondaryClassName="text-[11px]"
                />
              ) : (
                <p className="font-medium">{row.divisionLabel ?? "경기구분 미상"}</p>
              )}
              {row.courtName ? (
                <p className="text-muted-foreground mt-1 text-xs">
                  {row.courtName}
                  {row.courtOrder != null ? ` · ${row.courtOrder}경기` : ""}
                </p>
              ) : (
                <p className="text-muted-foreground mt-1 text-xs">
                  경기장 이동 필요
                </p>
              )}
            </div>
            <OrganizerOperationStatusBadges
              phase={getOperationMatchPhase(row)}
              phaseLabel={row.phaseLabel}
              resultStatusLabel={row.resultStatusLabel}
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-md border px-3 py-2 text-sm">
              <p className="text-muted-foreground text-xs">선수 A</p>
              <p className="font-medium">{row.fighterRed?.name ?? "—"}</p>
              {row.winnerId && row.winnerId === row.fighterRed?.id ? (
                <span className="text-destructive text-[11px] font-semibold">
                  승
                </span>
              ) : null}
              <p className="text-muted-foreground text-xs">
                {row.fighterRed?.gymName ?? "—"}
              </p>
              <FighterHandicapBadge
                handicap={row.fighterRed?.handicap}
                cornerLabel="홍코너"
                compact
                className="mt-1"
              />
            </div>
            <div className="rounded-md border px-3 py-2 text-sm">
              <p className="text-muted-foreground text-xs">선수 B</p>
              <p className="font-medium">{row.fighterBlue?.name ?? "—"}</p>
              {row.winnerId && row.winnerId === row.fighterBlue?.id ? (
                <span className="text-primary text-[11px] font-semibold">
                  승
                </span>
              ) : null}
              <p className="text-muted-foreground text-xs">
                {row.fighterBlue?.gymName ?? "—"}
              </p>
              <FighterHandicapBadge
                handicap={row.fighterBlue?.handicap}
                cornerLabel="청코너"
                compact
                className="mt-1"
              />
            </div>
          </div>

          <OperationJudgeBriefCell
            matchId={row.matchId}
            items={judgeBriefByMatch[row.matchId] ?? []}
          />

          <OrganizerOperationActions
            match={row}
            onOpenResult={() => onTogglePanel(row)}
            onOpenView={() => onTogglePanel(row)}
          />

          {expandedMatchId === row.matchId ? (
            <div className="space-y-3 border-t pt-3">
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
              <section className="border-t pt-3">
                <h3 className="mb-2 text-sm font-semibold">주심 입력</h3>
                <OrganizerMatchOpsPanel {...toMatchOpsProps(row)} />
              </section>
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}
