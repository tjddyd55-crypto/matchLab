import type { JudgeScorecardStatus } from "@/generated/prisma";
import {
  hasAnyCompleteJudgeRound,
  isJudgeAllRoundsBlank,
  isJudgeRoundBlank,
  sumCompleteJudgeRounds,
  validateJudgeRounds,
} from "@/lib/judge-round-score-validation";

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
  return isJudgeRoundBlank(round);
}

export function isJudgeSlotEmpty(rounds: MatchOpsJudgeRoundInput[]): boolean {
  return isJudgeAllRoundsBlank(rounds);
}

export function isJudgeSlotComplete(
  _roundCount: number,
  rounds: MatchOpsJudgeRoundInput[],
): boolean {
  return hasAnyCompleteJudgeRound(rounds);
}

export type JudgeScoreTotalsVM = {
  redTotal: number | null;
  blueTotal: number | null;
  completedJudgeCount: number;
  isTie: boolean;
};

export function calculateJudgeScoreTotals(input: {
  roundCount: number;
  slots: { rounds: MatchOpsJudgeRoundInput[] }[];
}): JudgeScoreTotalsVM {
  let redTotal = 0;
  let blueTotal = 0;
  let completedJudgeCount = 0;

  for (const slot of input.slots) {
    const summed = sumCompleteJudgeRounds(slot.rounds);
    if (!summed) continue;
    completedJudgeCount += 1;
    redTotal += summed.redTotal;
    blueTotal += summed.blueTotal;
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
  _roundCount: number,
  rounds: MatchOpsJudgeRoundInput[],
): string | null {
  if (isJudgeSlotEmpty(rounds)) return null;
  return validateJudgeRounds(rounds, judgeOrder > 0 ? judgeOrder : undefined);
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
