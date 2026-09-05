import type { JudgeScorecardStatus } from "@/generated/prisma";

export const MATCH_OPS_JUDGE_SLOT_COUNT = 3;

export type MatchOpsJudgeRoundInput = {
  roundNumber: number;
  redScore: number | null;
  blueScore: number | null;
};

export type MatchOpsJudgeSlotState = {
  judgeOrder: number;
  credentialId: string | null;
  judgeName: string | null;
  status: JudgeScorecardStatus | "none";
  updatedAt: string | null;
  redTotal: number | null;
  blueTotal: number | null;
  rounds: MatchOpsJudgeRoundInput[];
};

export type MatchOpsJudgeSlotAssignment = {
  judgeOrder: number;
  credentialId: string | null;
};

export type MatchOpsJudgeScorecardLike = {
  credentialId: string;
  judgeName: string;
  status: JudgeScorecardStatus;
  updatedAt: Date;
  redTotal: number | null;
  blueTotal: number | null;
  rounds: MatchOpsJudgeRoundInput[];
};

export function buildMatchOpsSlotLoginId(
  eventId: string,
  judgeOrder: number,
): string {
  return `matchops-${eventId}-slot-${judgeOrder}`.toLowerCase();
}

export function isJudgeSlotRoundEmpty(round: MatchOpsJudgeRoundInput): boolean {
  return round.redScore == null && round.blueScore == null;
}

export function isJudgeSlotEmpty(rounds: MatchOpsJudgeRoundInput[]): boolean {
  return rounds.every(isJudgeSlotRoundEmpty);
}

export function isJudgeSlotComplete(
  roundCount: number,
  rounds: MatchOpsJudgeRoundInput[],
): boolean {
  if (isJudgeSlotEmpty(rounds)) return false;
  return validateJudgeSlotForSave(0, roundCount, rounds) === null;
}

export type JudgeScoreTotalsVM = {
  redTotal: number | null;
  blueTotal: number | null;
  completedJudgeCount: number;
  isTie: boolean;
};

/** 완료된 심판 슬롯의 라운드 점수를 합산한 경기운영 최종 합계(derived) */
export function calculateJudgeScoreTotals(input: {
  roundCount: number;
  slots: { rounds: MatchOpsJudgeRoundInput[] }[];
}): JudgeScoreTotalsVM {
  let redTotal = 0;
  let blueTotal = 0;
  let completedJudgeCount = 0;

  for (const slot of input.slots) {
    if (!isJudgeSlotComplete(input.roundCount, slot.rounds)) continue;
    completedJudgeCount += 1;
    for (const round of slot.rounds) {
      redTotal += round.redScore ?? 0;
      blueTotal += round.blueScore ?? 0;
    }
  }

  if (completedJudgeCount === 0) {
    return {
      redTotal: null,
      blueTotal: null,
      completedJudgeCount: 0,
      isTie: false,
    };
  }

  return {
    redTotal,
    blueTotal,
    completedJudgeCount,
    isTie: redTotal === blueTotal,
  };
}

export function validateJudgeSlotForSave(
  judgeOrder: number,
  roundCount: number,
  rounds: MatchOpsJudgeRoundInput[],
): string | null {
  if (isJudgeSlotEmpty(rounds)) return null;
  if (rounds.length !== roundCount) {
    return `채점심판 ${judgeOrder}: ${roundCount}라운드 점수를 입력해 주세요.`;
  }
  for (const round of rounds) {
    const hasRed = round.redScore != null;
    const hasBlue = round.blueScore != null;
    if (!hasRed && !hasBlue) {
      return `채점심판 ${judgeOrder}: ${round.roundNumber}라운드 점수를 모두 입력해 주세요.`;
    }
    if (hasRed !== hasBlue) {
      return `채점심판 ${judgeOrder}: ${round.roundNumber}라운드 홍/청 점수를 모두 입력해 주세요.`;
    }
  }
  return null;
}

export function mapScorecardsToMatchOpsSlots(input: {
  assignments: MatchOpsJudgeSlotAssignment[];
  scorecards: MatchOpsJudgeScorecardLike[];
  roundCount: number;
}): MatchOpsJudgeSlotState[] {
  const usedCredentialIds = new Set<string>();
  const slots: MatchOpsJudgeSlotState[] = [];

  for (let judgeOrder = 1; judgeOrder <= MATCH_OPS_JUDGE_SLOT_COUNT; judgeOrder++) {
    const assignment = input.assignments.find((a) => a.judgeOrder === judgeOrder);
    const assignedCard = assignment?.credentialId
      ? input.scorecards.find((s) => s.credentialId === assignment.credentialId)
      : null;
    if (assignedCard) usedCredentialIds.add(assignedCard.credentialId);
    slots.push({
      judgeOrder,
      credentialId: assignedCard?.credentialId ?? assignment?.credentialId ?? null,
      judgeName: assignedCard?.judgeName ?? null,
      status: assignedCard?.status ?? "none",
      updatedAt: assignedCard?.updatedAt.toISOString() ?? null,
      redTotal: assignedCard?.redTotal ?? null,
      blueTotal: assignedCard?.blueTotal ?? null,
      rounds: assignedCard?.rounds ?? emptyRounds(input.roundCount),
    });
  }

  const spare = [...input.scorecards]
    .filter((card) => !usedCredentialIds.has(card.credentialId))
    .sort(
      (a, b) =>
        (a.updatedAt.getTime() ?? 0) - (b.updatedAt.getTime() ?? 0),
    );

  for (const slot of slots) {
    if (slot.credentialId || spare.length === 0) continue;
    const card = spare.shift()!;
    slot.credentialId = card.credentialId;
    slot.judgeName = card.judgeName;
    slot.status = card.status;
    slot.updatedAt = card.updatedAt.toISOString();
    slot.redTotal = card.redTotal;
    slot.blueTotal = card.blueTotal;
    slot.rounds = card.rounds;
    usedCredentialIds.add(card.credentialId);
  }

  return slots;
}

export function emptyRounds(roundCount: number): MatchOpsJudgeRoundInput[] {
  return Array.from({ length: roundCount }, (_, index) => ({
    roundNumber: index + 1,
    redScore: null,
    blueScore: null,
  }));
}

export function parseJudgeScoreInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return null;
  return Math.min(10, Math.max(0, Math.round(n)));
}
