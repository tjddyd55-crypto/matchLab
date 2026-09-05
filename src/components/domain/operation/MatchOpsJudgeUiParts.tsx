import type { JudgeCornerDecision } from "@/lib/match-ops-judge-decision";
import { judgeCornerDecisionBadgeLabel } from "@/lib/match-ops-judge-decision";
import {
  matchonBlueCornerTextClass,
  matchonRedCornerTextClass,
} from "@/lib/ui/judge-ui";
import { cn } from "@/lib/utils";

export function judgeCornerDecisionSurfaceClass(
  decision: JudgeCornerDecision,
): string {
  switch (decision) {
    case "red":
      return cn(
        matchonRedCornerTextClass,
        "border-red-200/90 bg-red-50/80 dark:border-red-900/50 dark:bg-red-950/30",
      );
    case "blue":
      return cn(
        matchonBlueCornerTextClass,
        "border-blue-200/90 bg-blue-50/80 dark:border-blue-900/50 dark:bg-blue-950/30",
      );
    case "draw":
      return "border-border bg-muted/40 text-[#334155]";
    default:
      return "border-border bg-muted/20 text-muted-foreground";
  }
}

export function officialWinnerTextClass(input: {
  resultType: string | null;
  winnerCorner: "red" | "blue" | "neutral";
}): string {
  if (input.resultType === "draw") {
    return "text-[#334155]";
  }
  if (input.winnerCorner === "red") return matchonRedCornerTextClass;
  if (input.winnerCorner === "blue") return matchonBlueCornerTextClass;
  return "text-[#0F172A]";
}

export function JudgeSlotSummaryBlock({
  redTotal,
  blueTotal,
  decision,
  isPartial,
}: {
  redTotal: number;
  blueTotal: number;
  decision: JudgeCornerDecision;
  isPartial: boolean;
}) {
  const label = judgeCornerDecisionBadgeLabel(decision, isPartial);

  return (
    <div className="mt-3 space-y-3 border-t border-border/70 pt-3 text-center">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-[#0F172A]">합계</p>
        <p className="text-lg font-bold tabular-nums leading-tight sm:text-xl">
          <span className={matchonRedCornerTextClass}>홍 {redTotal}</span>
          <span className="text-muted-foreground mx-2 font-medium">:</span>
          <span className={matchonBlueCornerTextClass}>{blueTotal} 청</span>
        </p>
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground sm:text-sm">
          심판 판정
        </p>
        <p
          className={cn(
            "mx-auto inline-flex min-w-[9rem] items-center justify-center rounded-lg border px-4 py-2 text-sm font-bold sm:text-base",
            judgeCornerDecisionSurfaceClass(decision),
          )}
        >
          {label}
        </p>
      </div>
    </div>
  );
}
