"use client";

import {
  aggregateJudgeDecisions,
  buildMatchOpsJudgeDecisionRows,
  judgeCornerDecisionBadgeLabel,
  type JudgeDecisionVM,
} from "@/lib/match-ops-judge-decision";
import type { MatchOpsJudgePortalEntry, MatchOpsJudgeSlotState } from "@/lib/match-ops-judge-score";
import {
  matchonBlueCornerTextClass,
  matchonRedCornerTextClass,
} from "@/lib/ui/judge-ui";
import { cn } from "@/lib/utils";

function JudgeDecisionCard({ judge }: { judge: JudgeDecisionVM }) {
  return (
    <div className="rounded-md border bg-background/80 px-2.5 py-2">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 truncate text-xs font-semibold text-[#0F172A]">
          {judge.judgeLabel}
        </p>
        {judge.isPartial ? (
          <span className="text-muted-foreground shrink-0 text-[10px]">
            현재 입력 기준
          </span>
        ) : null}
      </div>
      <div className="mt-1.5 space-y-0.5">
        {judge.rounds.map((round) => {
          if (round.redScore == null && round.blueScore == null) return null;
          return (
            <p
              key={round.roundNumber}
              className="text-muted-foreground text-[11px] tabular-nums"
            >
              {round.roundNumber}R{" "}
              <span className={matchonRedCornerTextClass}>
                {round.redScore ?? "—"}
              </span>
              {" : "}
              <span className={matchonBlueCornerTextClass}>
                {round.blueScore ?? "—"}
              </span>
            </p>
          );
        })}
      </div>
      {judge.redTotal != null && judge.blueTotal != null ? (
        <>
          <p className="mt-2 text-[11px] font-medium text-[#0F172A]">
            합계{" "}
            <span className={matchonRedCornerTextClass}>
              홍 {judge.redTotal}
            </span>
            {" : "}
            <span className={matchonBlueCornerTextClass}>
              {judge.blueTotal} 청
            </span>
          </p>
          <p className="mt-1">
            <span className="inline-flex rounded-md border border-primary/20 bg-primary/5 px-2 py-0.5 text-[11px] font-semibold text-[#0F172A]">
              {judgeCornerDecisionBadgeLabel(judge.decision, judge.isPartial)}
            </span>
          </p>
        </>
      ) : null}
    </div>
  );
}

export function MatchOpsJudgeDecisionSummary({
  roundCount,
  manualSlots,
  portalEntries,
  compact = false,
}: {
  roundCount: number;
  manualSlots: MatchOpsJudgeSlotState[];
  portalEntries: MatchOpsJudgePortalEntry[];
  compact?: boolean;
}) {
  const judges = buildMatchOpsJudgeDecisionRows({
    roundCount,
    manualSlots,
    portalEntries,
  });
  const votes = aggregateJudgeDecisions(judges);

  if (judges.length === 0) {
    return (
      <p className="text-muted-foreground text-xs">
        입력된 심판 점수가 없습니다.
      </p>
    );
  }

  return (
    <div className={cn("space-y-3", compact && "space-y-2")}>
      <div className="space-y-2">
        {judges.map((judge) => (
          <JudgeDecisionCard key={judge.judgeKey} judge={judge} />
        ))}
      </div>

      <div className="rounded-lg border bg-muted/20 px-3 py-2.5">
        <p className="text-xs font-semibold text-[#0F172A]">심판 판정 집계</p>
        <p className="mt-1.5 text-[11px] leading-relaxed text-[#334155]">
          홍코너 {votes.redVotes}승 · 청코너 {votes.blueVotes}승 · 무승부{" "}
          {votes.drawVotes}
        </p>
        {votes.judgedCount > 0 ? (
          <p className="mt-1 text-[11px] font-medium text-[#0F172A]">
            판정 추천: {votes.recommendationLabel}
          </p>
        ) : null}
        {votes.referenceRedTotalSum > 0 || votes.referenceBlueTotalSum > 0 ? (
          <p className="text-muted-foreground mt-1.5 text-[10px]">
            전체 점수 참고 — 홍 {votes.referenceRedTotalSum} : 청{" "}
            {votes.referenceBlueTotalSum} (공식 판정 기준 아님)
          </p>
        ) : null}
      </div>
    </div>
  );
}
