"use client";

import { BracketMatchOutcomeStyle } from "@/lib/enums";
import { outcomeStylePublicLabel } from "@/lib/match-result-snapshot";
import { officialWinnerTextClass } from "@/components/domain/operation/MatchOpsJudgeUiParts";
import { Badge } from "@/components/ui/badge";
import { organizerOperationSectionTitleClass } from "@/lib/ui/organizer-operation-ui";
import { cn } from "@/lib/utils";

function resolveWinnerSummary(input: {
  winnerId: string | null;
  resultType: BracketMatchOutcomeStyle | null;
  fighterRedId: string | null;
  fighterBlueId: string | null;
  fighterRedName: string;
  fighterBlueName: string;
}): { text: string; corner: "red" | "blue" | "neutral" } {
  if (input.resultType === BracketMatchOutcomeStyle.draw) {
    return { text: "무승부", corner: "neutral" };
  }
  if (input.resultType === BracketMatchOutcomeStyle.no_contest) {
    return { text: "노콘테스트", corner: "neutral" };
  }
  if (input.winnerId && input.winnerId === input.fighterRedId) {
    return {
      text: `홍코너 ${input.fighterRedName} 승`,
      corner: "red",
    };
  }
  if (input.winnerId && input.winnerId === input.fighterBlueId) {
    return {
      text: `청코너 ${input.fighterBlueName} 승`,
      corner: "blue",
    };
  }
  return { text: "미정", corner: "neutral" };
}

/** 공식 최종결과만 표시 — 심판별 상세는 채점심판 영역 SSOT */
export function MatchOpsConfirmedResultPanel({
  hasOfficialResults,
  winnerId,
  resultType,
  fighterRedId,
  fighterBlueId,
  fighterRedName,
  fighterBlueName,
}: {
  matchId?: string;
  hasOfficialResults: boolean;
  winnerId: string | null;
  resultType: BracketMatchOutcomeStyle | null;
  fighterRedId: string | null;
  fighterBlueId: string | null;
  fighterRedName: string;
  fighterBlueName: string;
  opsToken?: string;
  resetKey?: string;
}) {
  if (!hasOfficialResults) return null;

  const methodLabel =
    (resultType ? outcomeStylePublicLabel(resultType) : null) ?? "—";
  const winner = resolveWinnerSummary({
    winnerId,
    resultType,
    fighterRedId,
    fighterBlueId,
    fighterRedName,
    fighterBlueName,
  });

  return (
    <div className="space-y-3 rounded-xl border-2 border-emerald-200/80 bg-emerald-50/40 px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={cn(organizerOperationSectionTitleClass, "text-base sm:text-lg")}>
          공식 최종결과
        </p>
        <Badge variant="resultConfirmed" className="text-xs">
          확정완료
        </Badge>
      </div>

      <div className="space-y-3 text-center">
        <p>
          <span
            className={cn(
              "inline-flex rounded-lg border px-3 py-1 text-sm font-bold sm:text-base",
              "border-primary/30 bg-primary/10 text-primary",
            )}
          >
            {methodLabel}
          </span>
        </p>
        <p
          className={cn(
            "text-xl font-bold leading-snug sm:text-2xl",
            officialWinnerTextClass({
              resultType,
              winnerCorner: winner.corner,
            }),
          )}
        >
          {winner.text}
        </p>
      </div>
    </div>
  );
}
