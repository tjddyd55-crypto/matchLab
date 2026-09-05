"use client";

import {
  aggregateJudgeDecisions,
  buildMatchOpsJudgeDecisionRows,
} from "@/lib/match-ops-judge-decision";
import type { MatchOpsJudgePortalEntry, MatchOpsJudgeSlotState } from "@/lib/match-ops-judge-score";
import {
  matchonBlueCornerTextClass,
  matchonRedCornerTextClass,
} from "@/lib/ui/judge-ui";
import { cn } from "@/lib/utils";

function VoteCountCell({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: "red" | "blue" | "neutral";
}) {
  const toneClass =
    tone === "red"
      ? matchonRedCornerTextClass
      : tone === "blue"
        ? matchonBlueCornerTextClass
        : "text-[#334155]";

  return (
    <div className="rounded-lg border bg-background/80 px-3 py-2.5 text-center">
      <p className={cn("text-xs font-semibold sm:text-sm", toneClass)}>
        {label}
      </p>
      <p className={cn("mt-1 text-2xl font-bold tabular-nums sm:text-3xl", toneClass)}>
        {count}
        <span className="ml-0.5 text-base font-semibold sm:text-lg">표</span>
      </p>
    </div>
  );
}

/** 심판별 상세 없이 전체 표수만 표시 */
export function MatchOpsJudgeVoteAggregate({
  roundCount,
  manualSlots,
  portalEntries,
}: {
  roundCount: number;
  manualSlots: MatchOpsJudgeSlotState[];
  portalEntries: MatchOpsJudgePortalEntry[];
}) {
  const judges = buildMatchOpsJudgeDecisionRows({
    roundCount,
    manualSlots,
    portalEntries,
  });
  const votes = aggregateJudgeDecisions(judges);

  if (judges.length === 0) {
    return (
      <p className="text-muted-foreground text-center text-sm">
        입력된 심판 점수가 없습니다.
      </p>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border-2 border-border/80 bg-muted/15 px-4 py-4">
      <p className="text-center text-base font-bold text-[#0F172A] sm:text-lg">
        심판 판정 집계
      </p>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <VoteCountCell label="홍코너" count={votes.redVotes} tone="red" />
        <VoteCountCell label="청코너" count={votes.blueVotes} tone="blue" />
        <VoteCountCell label="무승부" count={votes.drawVotes} tone="neutral" />
      </div>
    </div>
  );
}

/** @deprecated aggregate-only — use MatchOpsJudgeVoteAggregate */
export function MatchOpsJudgeDecisionSummary(props: {
  roundCount: number;
  manualSlots: MatchOpsJudgeSlotState[];
  portalEntries: MatchOpsJudgePortalEntry[];
  compact?: boolean;
}) {
  return <MatchOpsJudgeVoteAggregate {...props} />;
}
