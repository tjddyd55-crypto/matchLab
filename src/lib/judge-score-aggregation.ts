import type { JudgeWinnerCorner } from "@/generated/prisma";

export type JudgeScorecardAggregateInput = {
  judgeName: string;
  redTotal: number | null;
  blueTotal: number | null;
  winnerCorner: JudgeWinnerCorner;
  submitted: boolean;
};

export type JudgeMatchAggregationVM = {
  assignedCount: number;
  submittedCount: number;
  pendingJudgeNames: string[];
  scorecards: {
    judgeName: string;
    redTotal: number | null;
    blueTotal: number | null;
    winnerCorner: JudgeWinnerCorner;
    submitted: boolean;
  }[];
  redVoteCount: number;
  blueVoteCount: number;
  drawVoteCount: number;
  recommendedCorner: "red" | "blue" | "draw" | "tie" | "undecided";
  recommendedLabel: string;
  needsOrganizerDecision: boolean;
  totalRedSum: number;
  totalBlueSum: number;
};

const CORNER_LABEL: Record<string, string> = {
  red: "홍코너",
  blue: "청코너",
  draw: "무승부",
  no_contest: "노컨테스트",
  undecided: "미정",
};

function cornerLabel(c: JudgeWinnerCorner | "red" | "blue" | "draw"): string {
  return CORNER_LABEL[c] ?? c;
}

export function aggregateJudgeScorecards(
  assignedJudgeNames: string[],
  scorecards: JudgeScorecardAggregateInput[],
): JudgeMatchAggregationVM {
  const submitted = scorecards.filter((s) => s.submitted);
  const submittedNames = new Set(submitted.map((s) => s.judgeName));
  const pendingJudgeNames = assignedJudgeNames.filter(
    (n) => !submittedNames.has(n),
  );

  let redVotes = 0;
  let blueVotes = 0;
  let drawVotes = 0;
  let totalRedSum = 0;
  let totalBlueSum = 0;

  for (const card of submitted) {
    if (card.winnerCorner === "red") redVotes += 1;
    else if (card.winnerCorner === "blue") blueVotes += 1;
    else if (card.winnerCorner === "draw") drawVotes += 1;

    if (typeof card.redTotal === "number") totalRedSum += card.redTotal;
    if (typeof card.blueTotal === "number") totalBlueSum += card.blueTotal;
  }

  let recommendedCorner: JudgeMatchAggregationVM["recommendedCorner"] =
    "undecided";
  let recommendedLabel = "제출된 채점표가 없습니다.";
  let needsOrganizerDecision = false;

  if (submitted.length > 0) {
    const maxVotes = Math.max(redVotes, blueVotes, drawVotes);
    const leaders: ("red" | "blue" | "draw")[] = [];
    if (redVotes === maxVotes) leaders.push("red");
    if (blueVotes === maxVotes) leaders.push("blue");
    if (drawVotes === maxVotes) leaders.push("draw");

    if (leaders.length === 1) {
      recommendedCorner = leaders[0]!;
      recommendedLabel = `${cornerLabel(recommendedCorner)} 승 (${redVotes}:${blueVotes}${drawVotes > 0 ? `, 무 ${drawVotes}` : ""})`;
    } else {
      // 다수결 동률 — 총점 합산 참고
      if (totalRedSum > totalBlueSum) {
        recommendedCorner = "red";
        recommendedLabel = `다수결 동률 — 총점 합산 참고: 홍 ${totalRedSum} vs 청 ${totalBlueSum}`;
      } else if (totalBlueSum > totalRedSum) {
        recommendedCorner = "blue";
        recommendedLabel = `다수결 동률 — 총점 합산 참고: 홍 ${totalRedSum} vs 청 ${totalBlueSum}`;
      } else {
        recommendedCorner = "tie";
        recommendedLabel = "다수결·총점 합산 모두 동률 — 주심/주최자 최종 결정 필요";
        needsOrganizerDecision = true;
      }
    }

    if (submitted.length % 2 === 0 && leaders.length > 1) {
      needsOrganizerDecision = true;
    }
  }

  return {
    assignedCount: assignedJudgeNames.length,
    submittedCount: submitted.length,
    pendingJudgeNames,
    scorecards: scorecards.map((s) => ({
      judgeName: s.judgeName,
      redTotal: s.redTotal,
      blueTotal: s.blueTotal,
      winnerCorner: s.winnerCorner,
      submitted: s.submitted,
    })),
    redVoteCount: redVotes,
    blueVoteCount: blueVotes,
    drawVoteCount: drawVotes,
    recommendedCorner,
    recommendedLabel,
    needsOrganizerDecision,
    totalRedSum,
    totalBlueSum,
  };
}

export function computeScorecardTotals(
  rounds: {
    redScore: number | null;
    blueScore: number | null;
    redDeductions: number;
    blueDeductions: number;
  }[],
): { redTotal: number; blueTotal: number; winnerCorner: JudgeWinnerCorner } {
  let redTotal = 0;
  let blueTotal = 0;

  for (const r of rounds) {
    if (typeof r.redScore === "number") redTotal += r.redScore;
    if (typeof r.blueScore === "number") blueTotal += r.blueScore;
    redTotal -= r.redDeductions ?? 0;
    blueTotal -= r.blueDeductions ?? 0;
  }

  let winnerCorner: JudgeWinnerCorner = "undecided";
  if (redTotal > blueTotal) winnerCorner = "red";
  else if (blueTotal > redTotal) winnerCorner = "blue";
  else if (rounds.every((r) => r.redScore != null && r.blueScore != null)) {
    winnerCorner = "draw";
  }

  return { redTotal, blueTotal, winnerCorner };
}
