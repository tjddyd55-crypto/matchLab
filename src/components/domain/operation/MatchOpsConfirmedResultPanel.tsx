"use client";

import { useEffect, useState } from "react";
import { MatchOpsJudgeDecisionSummary } from "@/components/domain/operation/MatchOpsJudgeDecisionSummary";
import { getMatchOpsJudgeScoresAction } from "@/features/match-ops-judge/actions";
import { BracketMatchOutcomeStyle } from "@/lib/enums";
import { outcomeStylePublicLabel } from "@/lib/match-result-snapshot";
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
}): string {
  if (input.resultType === BracketMatchOutcomeStyle.draw) return "무승부";
  if (input.resultType === BracketMatchOutcomeStyle.no_contest) {
    return "노콘테스트";
  }
  if (input.winnerId && input.winnerId === input.fighterRedId) {
    return `홍코너 ${input.fighterRedName} 승`;
  }
  if (input.winnerId && input.winnerId === input.fighterBlueId) {
    return `청코너 ${input.fighterBlueName} 승`;
  }
  return "미정";
}

export function MatchOpsConfirmedResultPanel({
  matchId,
  hasOfficialResults,
  winnerId,
  resultType,
  fighterRedId,
  fighterBlueId,
  fighterRedName,
  fighterBlueName,
  opsToken,
  resetKey,
}: {
  matchId: string;
  hasOfficialResults: boolean;
  winnerId: string | null;
  resultType: BracketMatchOutcomeStyle | null;
  fighterRedId: string | null;
  fighterBlueId: string | null;
  fighterRedName: string;
  fighterBlueName: string;
  opsToken?: string;
  resetKey: string;
}) {
  const [loading, setLoading] = useState(true);
  const [roundCount, setRoundCount] = useState(0);
  const [manualSlots, setManualSlots] = useState<
    import("@/lib/match-ops-judge-score").MatchOpsJudgeSlotState[]
  >([]);
  const [portalEntries, setPortalEntries] = useState<
    import("@/lib/match-ops-judge-score").MatchOpsJudgePortalEntry[]
  >([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const res = await getMatchOpsJudgeScoresAction(matchId, opsToken);
      if (cancelled) return;
      if (res.ok) {
        setRoundCount(res.data.roundCount);
        setManualSlots(res.data.manualSlots);
        setPortalEntries(res.data.portalEntries);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [matchId, opsToken, resetKey]);

  if (!hasOfficialResults) return null;

  const methodLabel =
    (resultType ? outcomeStylePublicLabel(resultType) : null) ?? "—";
  const winnerSummary = resolveWinnerSummary({
    winnerId,
    resultType,
    fighterRedId,
    fighterBlueId,
    fighterRedName,
    fighterBlueName,
  });

  return (
    <div className="space-y-3 rounded-lg border border-emerald-200/70 bg-emerald-50/30 px-3 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={organizerOperationSectionTitleClass}>최종결과</p>
        <Badge variant="resultConfirmed" className="text-[10px]">
          확정완료
        </Badge>
      </div>

      <div className="space-y-1">
        <p>
          <span
            className={cn(
              "inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold",
              "border-primary/25 bg-primary/10 text-primary",
            )}
          >
            {methodLabel}
          </span>
        </p>
        <p className="text-sm font-semibold text-[#0F172A]">{winnerSummary}</p>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-xs">채점 내역을 불러오는 중…</p>
      ) : (
        <MatchOpsJudgeDecisionSummary
          roundCount={roundCount}
          manualSlots={manualSlots}
          portalEntries={portalEntries}
        />
      )}
    </div>
  );
}
