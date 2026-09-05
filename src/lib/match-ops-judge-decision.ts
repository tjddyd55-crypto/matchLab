import {
  hasAnyCompleteJudgeRound,
  sumCompleteJudgeRounds,
  type JudgeRoundScoreInput,
} from "@/lib/judge-round-score-validation";

export type JudgeCornerDecision = "red" | "blue" | "draw" | "empty";

export type JudgeDecisionVM = {
  judgeKey: string;
  judgeLabel: string;
  source: "manual" | "portal";
  redTotal: number | null;
  blueTotal: number | null;
  decision: JudgeCornerDecision;
  completeRoundCount: number;
  isPartial: boolean;
  rounds: JudgeRoundScoreInput[];
};

export type JudgeVoteAggregationVM = {
  redVotes: number;
  blueVotes: number;
  drawVotes: number;
  recommendation: JudgeCornerDecision;
  recommendationLabel: string;
  judgedCount: number;
  /** 참고용 — 공식 판정 기준 아님 */
  referenceRedTotalSum: number;
  referenceBlueTotalSum: number;
};

const DECISION_LABEL: Record<JudgeCornerDecision, string> = {
  red: "홍코너 승",
  blue: "청코너 승",
  draw: "무승부",
  empty: "미입력",
};

export function judgeCornerDecisionLabel(decision: JudgeCornerDecision): string {
  return DECISION_LABEL[decision];
}

export function judgeCornerDecisionBadgeLabel(
  decision: JudgeCornerDecision,
  partial: boolean,
): string {
  if (decision === "empty") return DECISION_LABEL.empty;
  const base = DECISION_LABEL[decision];
  return partial ? `${base} (현재 입력 기준)` : base;
}

/** 완성된 라운드만 합산해 심판 1명의 판정을 계산한다. */
export function calculateJudgeDecision(
  rounds: JudgeRoundScoreInput[],
  roundCount?: number,
): {
  redTotal: number | null;
  blueTotal: number | null;
  decision: JudgeCornerDecision;
  completeRoundCount: number;
  isPartial: boolean;
} {
  const summed = sumCompleteJudgeRounds(rounds);
  if (!summed) {
    return {
      redTotal: null,
      blueTotal: null,
      decision: "empty",
      completeRoundCount: 0,
      isPartial: false,
    };
  }

  const { redTotal, blueTotal, completeRoundCount } = summed;
  const targetRounds = roundCount ?? rounds.length;
  const isPartial =
    completeRoundCount < targetRounds || !hasAllRoundsComplete(rounds, targetRounds);

  let decision: JudgeCornerDecision = "draw";
  if (redTotal > blueTotal) decision = "red";
  else if (blueTotal > redTotal) decision = "blue";

  return {
    redTotal,
    blueTotal,
    decision,
    completeRoundCount,
    isPartial,
  };
}

function hasAllRoundsComplete(
  rounds: JudgeRoundScoreInput[],
  roundCount: number,
): boolean {
  for (let i = 1; i <= roundCount; i += 1) {
    const round = rounds.find((r) => r.roundNumber === i);
    if (!round || round.redScore == null || round.blueScore == null) {
      return false;
    }
  }
  return true;
}

export function buildMatchOpsJudgeDecisionRows(input: {
  roundCount: number;
  manualSlots: {
    judgeOrder: number;
    judgeName: string | null;
    rounds: JudgeRoundScoreInput[];
  }[];
  portalEntries: {
    credentialId: string;
    judgeName: string;
    rounds: JudgeRoundScoreInput[];
  }[];
}): JudgeDecisionVM[] {
  const manual = input.manualSlots
    .filter((slot) => hasAnyCompleteJudgeRound(slot.rounds))
    .map((slot) => {
      const computed = calculateJudgeDecision(slot.rounds, input.roundCount);
      return {
        judgeKey: `manual-${slot.judgeOrder}`,
        judgeLabel: slot.judgeName?.trim() || `채점심판 ${slot.judgeOrder}`,
        source: "manual" as const,
        rounds: slot.rounds,
        ...computed,
      };
    });

  const portal = input.portalEntries
    .filter((entry) => hasAnyCompleteJudgeRound(entry.rounds))
    .map((entry) => {
      const computed = calculateJudgeDecision(entry.rounds, input.roundCount);
      return {
        judgeKey: `portal-${entry.credentialId}`,
        judgeLabel: entry.judgeName,
        source: "portal" as const,
        rounds: entry.rounds,
        ...computed,
      };
    });

  return [...manual, ...portal];
}

/** 심판별 판정 1표씩 집계. 전체 점수 총합은 판정 기준이 아니다. */
export function aggregateJudgeDecisions(
  judges: Pick<JudgeDecisionVM, "decision" | "redTotal" | "blueTotal">[],
): JudgeVoteAggregationVM {
  let redVotes = 0;
  let blueVotes = 0;
  let drawVotes = 0;
  let referenceRedTotalSum = 0;
  let referenceBlueTotalSum = 0;
  let judgedCount = 0;

  for (const judge of judges) {
    if (judge.decision === "empty") continue;
    judgedCount += 1;
    if (judge.decision === "red") redVotes += 1;
    else if (judge.decision === "blue") blueVotes += 1;
    else if (judge.decision === "draw") drawVotes += 1;

    if (typeof judge.redTotal === "number") {
      referenceRedTotalSum += judge.redTotal;
    }
    if (typeof judge.blueTotal === "number") {
      referenceBlueTotalSum += judge.blueTotal;
    }
  }

  let recommendation: JudgeCornerDecision = "empty";
  let recommendationLabel = "입력된 심판 판정이 없습니다.";

  if (judgedCount > 0) {
    if (redVotes > blueVotes) {
      recommendation = "red";
      recommendationLabel = "홍코너 승 추천";
    } else if (blueVotes > redVotes) {
      recommendation = "blue";
      recommendationLabel = "청코너 승 추천";
    } else {
      recommendation = "draw";
      recommendationLabel = "무승부 추천";
    }
  }

  return {
    redVotes,
    blueVotes,
    drawVotes,
    recommendation,
    recommendationLabel,
    judgedCount,
    referenceRedTotalSum,
    referenceBlueTotalSum,
  };
}
