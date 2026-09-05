import type { JudgeScorecardStatus } from "@/generated/prisma";
import {
  hasAnyCompleteJudgeRound,
  isJudgeAllRoundsBlank,
  isJudgeRoundBlank,
  sumCompleteJudgeRounds,
  validateJudgeRounds,
} from "@/lib/judge-round-score-validation";

export const MATCH_OPS_JUDGE_DEFAULT_SLOT_COUNT = 3;
/** @deprecated use MATCH_OPS_JUDGE_DEFAULT_SLOT_COUNT */
export const MATCH_OPS_JUDGE_SLOT_COUNT = MATCH_OPS_JUDGE_DEFAULT_SLOT_COUNT;

export type JudgeScoreSource = "OPERATOR_MANUAL" | "JUDGE_PORTAL";

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

export type MatchOpsJudgePortalEntry = {
  scorecardId: string;
  credentialId: string;
  judgeName: string;
  status: JudgeScorecardStatus;
  updatedAt: string;
  redTotal: number | null;
  blueTotal: number | null;
  rounds: MatchOpsJudgeRoundInput[];
  source: "JUDGE_PORTAL";
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

export type MatchOpsJudgeScorecardWithLogin = MatchOpsJudgeScorecardLike & {
  scorecardId: string;
  loginId: string;
};

export function buildMatchOpsSlotLoginId(
  eventId: string,
  judgeOrder: number,
): string {
  return `matchops-${eventId}-slot-${judgeOrder}`.toLowerCase();
}

export function isPortalJudgeLoginId(loginId: string): boolean {
  return loginId.trim().toLowerCase().startsWith("court-");
}

export function isMatchOpsManualLoginId(
  loginId: string,
  eventId: string,
): boolean {
  const normalized = loginId.trim().toLowerCase();
  const prefix = `matchops-${eventId.trim().toLowerCase()}-slot-`;
  return normalized.startsWith(prefix);
}

export function parseManualSlotOrderFromLoginId(
  loginId: string,
  eventId: string,
): number | null {
  const normalized = loginId.trim().toLowerCase();
  const prefix = `matchops-${eventId.trim().toLowerCase()}-slot-`;
  if (!normalized.startsWith(prefix)) return null;
  const suffix = normalized.slice(prefix.length);
  const order = Number(suffix);
  return Number.isFinite(order) && order > 0 ? order : null;
}

export function classifyScorecardSource(input: {
  loginId: string;
  eventId: string;
  assignmentJudgeOrder: number | null;
}): JudgeScoreSource {
  if (isPortalJudgeLoginId(input.loginId)) return "JUDGE_PORTAL";
  if (isMatchOpsManualLoginId(input.loginId, input.eventId)) {
    return "OPERATOR_MANUAL";
  }
  if (input.assignmentJudgeOrder != null && input.assignmentJudgeOrder > 0) {
    return "OPERATOR_MANUAL";
  }
  return "OPERATOR_MANUAL";
}

export function resolveManualSlotCount(input: {
  manualSlots?: MatchOpsJudgeSlotState[];
  requestedCount?: number;
  manualSlotOrdersFromData?: number[];
}): number {
  const highestFromSlots = (input.manualSlots ?? []).reduce((max, slot) => {
    const hasData =
      slot.credentialId != null ||
      slot.status !== "none" ||
      !isJudgeSlotEmpty(slot.rounds);
    if (!hasData) return max;
    return Math.max(max, slot.judgeOrder);
  }, 0);
  const highestFromData = Math.max(
    0,
    ...(input.manualSlotOrdersFromData ?? []),
  );
  return Math.max(
    MATCH_OPS_JUDGE_DEFAULT_SLOT_COUNT,
    highestFromSlots,
    highestFromData,
    input.requestedCount ?? 0,
  );
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
  manualCompletedCount: number;
  portalCompletedCount: number;
  isTie: boolean;
};

export function calculateJudgeScoreTotals(input: {
  roundCount: number;
  slots?: { rounds: MatchOpsJudgeRoundInput[] }[];
  manualSlots?: { rounds: MatchOpsJudgeRoundInput[] }[];
  portalEntries?: { rounds: MatchOpsJudgeRoundInput[] }[];
}): JudgeScoreTotalsVM {
  const manual = input.manualSlots ?? input.slots ?? [];
  const portal = input.portalEntries ?? [];

  let redTotal = 0;
  let blueTotal = 0;
  let manualCompletedCount = 0;
  let portalCompletedCount = 0;

  for (const slot of manual) {
    const summed = sumCompleteJudgeRounds(slot.rounds);
    if (!summed) continue;
    manualCompletedCount += 1;
    redTotal += summed.redTotal;
    blueTotal += summed.blueTotal;
  }

  for (const entry of portal) {
    const summed = sumCompleteJudgeRounds(entry.rounds);
    if (!summed) continue;
    portalCompletedCount += 1;
    redTotal += summed.redTotal;
    blueTotal += summed.blueTotal;
  }

  const completedJudgeCount = manualCompletedCount + portalCompletedCount;

  if (completedJudgeCount === 0) {
    return {
      redTotal: null,
      blueTotal: null,
      completedJudgeCount: 0,
      manualCompletedCount: 0,
      portalCompletedCount: 0,
      isTie: false,
    };
  }

  return {
    redTotal,
    blueTotal,
    completedJudgeCount,
    manualCompletedCount,
    portalCompletedCount,
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

export function mapManualScorecardsToSlots(input: {
  eventId: string;
  assignments: MatchOpsJudgeSlotAssignment[];
  scorecards: MatchOpsJudgeScorecardWithLogin[];
  roundCount: number;
  slotCount: number;
}): MatchOpsJudgeSlotState[] {
  const manualCards = input.scorecards.filter(
    (card) =>
      classifyScorecardSource({
        loginId: card.loginId,
        eventId: input.eventId,
        assignmentJudgeOrder:
          input.assignments.find((a) => a.credentialId === card.credentialId)
            ?.judgeOrder ?? null,
      }) === "OPERATOR_MANUAL",
  );

  const slots: MatchOpsJudgeSlotState[] = [];

  for (let judgeOrder = 1; judgeOrder <= input.slotCount; judgeOrder++) {
    const assignment = input.assignments.find((a) => a.judgeOrder === judgeOrder);
    const slotLoginId = buildMatchOpsSlotLoginId(input.eventId, judgeOrder);

    const card =
      (assignment?.credentialId
        ? manualCards.find((c) => c.credentialId === assignment.credentialId)
        : null) ??
      manualCards.find((c) => c.loginId.toLowerCase() === slotLoginId) ??
      null;

    slots.push({
      judgeOrder,
      credentialId: card?.credentialId ?? assignment?.credentialId ?? null,
      judgeName:
        card?.judgeName ??
        (assignment?.credentialId ? `채점심판 ${judgeOrder}` : null),
      status: card?.status ?? "none",
      updatedAt: card?.updatedAt.toISOString() ?? null,
      redTotal: card?.redTotal ?? null,
      blueTotal: card?.blueTotal ?? null,
      rounds: card?.rounds ?? emptyRounds(input.roundCount),
    });
  }

  return slots;
}

export function mapPortalScorecards(input: {
  eventId: string;
  assignments: MatchOpsJudgeSlotAssignment[];
  scorecards: MatchOpsJudgeScorecardWithLogin[];
}): MatchOpsJudgePortalEntry[] {
  return input.scorecards
    .filter(
      (card) =>
        classifyScorecardSource({
          loginId: card.loginId,
          eventId: input.eventId,
          assignmentJudgeOrder:
            input.assignments.find((a) => a.credentialId === card.credentialId)
              ?.judgeOrder ?? null,
        }) === "JUDGE_PORTAL",
    )
    .sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime())
    .map((card) => ({
      scorecardId: card.scorecardId,
      credentialId: card.credentialId,
      judgeName: card.judgeName,
      status: card.status,
      updatedAt: card.updatedAt.toISOString(),
      redTotal: card.redTotal,
      blueTotal: card.blueTotal,
      rounds: card.rounds,
      source: "JUDGE_PORTAL" as const,
    }));
}

/** @deprecated manual/portal 분리 전 호환. spare 카드를 수동 슬롯에 병합하지 않음. */
export function mapScorecardsToMatchOpsSlots(input: {
  eventId?: string;
  assignments: MatchOpsJudgeSlotAssignment[];
  scorecards: MatchOpsJudgeScorecardLike[];
  roundCount: number;
  slotCount?: number;
}): MatchOpsJudgeSlotState[] {
  const eventId = input.eventId ?? "";
  const scorecardsWithLogin: MatchOpsJudgeScorecardWithLogin[] =
    input.scorecards.map((card, index) => ({
      ...card,
      scorecardId: `legacy-${index}`,
      loginId: "",
    }));

  return mapManualScorecardsToSlots({
    eventId,
    assignments: input.assignments,
    scorecards: scorecardsWithLogin,
    roundCount: input.roundCount,
    slotCount: input.slotCount ?? MATCH_OPS_JUDGE_DEFAULT_SLOT_COUNT,
  });
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

export function countManualSlotsWithInput(
  slots: MatchOpsJudgeSlotState[],
): number {
  return slots.filter(
    (slot) => slot.status !== "none" || !isJudgeSlotEmpty(slot.rounds),
  ).length;
}

export function countPortalSubmitted(
  entries: Pick<MatchOpsJudgePortalEntry, "status" | "rounds">[],
): number {
  return entries.filter((entry) => {
    const submitted =
      entry.status === "submitted" ||
      entry.status === "revised" ||
      entry.status === "locked";
    return submitted || !isJudgeSlotEmpty(entry.rounds);
  }).length;
}
