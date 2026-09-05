import "server-only";

import { randomUUID } from "node:crypto";
import {
  JudgeCredentialRole,
  JudgeScorecardStatus,
  MatchRecordStatus,
} from "@/generated/prisma";
import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import { hashJudgePassword } from "@/lib/judge-password";
import { readRequestClientMeta } from "@/lib/judge-request-meta";
import { defaultRoundCountForSport } from "@/lib/judge-round-count";
import { computeScorecardTotals } from "@/lib/judge-score-aggregation";
import { effectiveScoringRoundCountFromOps } from "@/lib/court-judge-rounds";
import {
  buildMatchOpsSlotLoginId,
  emptyRounds,
  isJudgeSlotEmpty,
  mapScorecardsToMatchOpsSlots,
  MATCH_OPS_JUDGE_SLOT_COUNT,
  validateJudgeSlotForSave,
  type MatchOpsJudgeRoundInput,
  type MatchOpsJudgeSlotState,
} from "@/lib/match-ops-judge-score";
import { parseMatchOperationalSettings } from "@/lib/match-operational-settings";
import { requireOrganizerForEvent, requireRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { judgeAssignmentRepository } from "@/lib/repositories/judge-assignment.repository";
import { judgeCredentialRepository } from "@/lib/repositories/judge-credential.repository";
import { judgeScorecardRepository } from "@/lib/repositories/judge-scorecard.repository";

export type MatchOpsJudgeScoreEntryVM = {
  matchId: string;
  roundCount: number;
  isLocked: boolean;
  slots: MatchOpsJudgeSlotState[];
};

export type SaveMatchOpsJudgeSlotsInput = {
  matchId: string;
  slots: {
    judgeOrder: number;
    credentialId: string | null;
    updatedAt: string | null;
    rounds: MatchOpsJudgeRoundInput[];
  }[];
};

async function loadMatchForOps(matchId: string) {
  const match = await prisma.bracketMatch.findUnique({
    where: { id: matchId },
    include: {
      fighterRed: { select: { id: true } },
      fighterBlue: { select: { id: true } },
      matchResults: { select: { status: true } },
      bracket: {
        select: {
          eventId: true,
          division: { select: { sportType: true } },
        },
      },
    },
  });
  if (!match) throw new AppError("NOT_FOUND", "경기를 찾을 수 없습니다.");
  return match;
}

function isMatchResultLocked(
  results: { status: MatchRecordStatus }[],
): boolean {
  const official = results.filter(
    (r) =>
      r.status === MatchRecordStatus.confirmed ||
      r.status === MatchRecordStatus.corrected,
  );
  return official.length >= 2;
}

function resolveRoundCount(
  resultMemo: string | null,
  sportType: string | null,
): number {
  const ops = parseMatchOperationalSettings(resultMemo).settings;
  const baseRoundCount =
    ops.roundCount || defaultRoundCountForSport(sportType);
  return effectiveScoringRoundCountFromOps({
    ...ops,
    roundCount: baseRoundCount,
  });
}

async function resolveSlotCredentialId(
  eventId: string,
  matchId: string,
  judgeOrder: number,
  existingCredentialId: string | null,
): Promise<string | null> {
  if (existingCredentialId) return existingCredentialId;

  const assignments = await judgeAssignmentRepository.listByMatch(matchId);
  const assignment = assignments.find((a) => a.judgeOrder === judgeOrder);
  if (assignment?.credentialId) return assignment.credentialId;

  const loginId = buildMatchOpsSlotLoginId(eventId, judgeOrder);
  let credential = await judgeCredentialRepository.findByLoginId(loginId);
  if (!credential) {
    credential = await judgeCredentialRepository.create({
      eventId,
      loginId,
      passwordHash: hashJudgePassword(randomUUID()),
      displayName: `채점심판 ${judgeOrder}`,
      role: JudgeCredentialRole.SCORING_JUDGE,
      memo: "경기운영 수기 채점 슬롯",
    });
  }
  return credential.id;
}

export const matchOpsJudgeScoreService = {
  async getEntryForOrganizer(
    actor: ActorContext,
    matchId: string,
  ): Promise<MatchOpsJudgeScoreEntryVM> {
    requireRole(actor, ["organizer", "admin"]);
    const match = await loadMatchForOps(matchId);
    await requireOrganizerForEvent(actor, match.bracket.eventId);

    const [assignments, scorecards] = await Promise.all([
      judgeAssignmentRepository.listByMatch(matchId),
      judgeScorecardRepository.listByMatch(matchId),
    ]);

    const roundCount = resolveRoundCount(
      match.resultMemo,
      match.bracket.division?.sportType ?? null,
    );

    const slots = mapScorecardsToMatchOpsSlots({
      assignments: assignments.map((a) => ({
        judgeOrder: a.judgeOrder,
        credentialId: a.credentialId,
      })),
      scorecards: scorecards.map((card) => ({
        credentialId: card.credentialId,
        judgeName: card.judgeName,
        status: card.status,
        updatedAt: card.updatedAt,
        redTotal: card.redTotal,
        blueTotal: card.blueTotal,
        rounds: card.rounds.map((round) => ({
          roundNumber: round.roundNumber,
          redScore: round.redScore,
          blueScore: round.blueScore,
        })),
      })),
      roundCount,
    });

    return {
      matchId,
      roundCount,
      isLocked: isMatchResultLocked(match.matchResults),
      slots,
    };
  },

  async saveSlotsForOrganizer(
    actor: ActorContext,
    input: SaveMatchOpsJudgeSlotsInput,
  ): Promise<MatchOpsJudgeScoreEntryVM> {
    requireRole(actor, ["organizer", "admin"]);
    const match = await loadMatchForOps(input.matchId);
    await requireOrganizerForEvent(actor, match.bracket.eventId);

    if (isMatchResultLocked(match.matchResults)) {
      throw new AppError(
        "FORBIDDEN",
        "이미 공식 결과가 확정되어 채점표를 수정할 수 없습니다.",
      );
    }

    const roundCount = resolveRoundCount(
      match.resultMemo,
      match.bracket.division?.sportType ?? null,
    );

    if (input.slots.length !== MATCH_OPS_JUDGE_SLOT_COUNT) {
      throw new AppError("VALIDATION_ERROR", "채점심판 슬롯 수가 올바르지 않습니다.");
    }

    for (const slot of input.slots) {
      const validationError = validateJudgeSlotForSave(
        slot.judgeOrder,
        roundCount,
        slot.rounds,
      );
      if (validationError) {
        throw new AppError("VALIDATION_ERROR", validationError);
      }
    }

    const meta = await readRequestClientMeta();

    for (const slot of input.slots) {
      const credentialId = await resolveSlotCredentialId(
        match.bracket.eventId,
        input.matchId,
        slot.judgeOrder,
        slot.credentialId,
      );
      if (!credentialId) continue;

      const existing = await judgeScorecardRepository.findByMatchAndCredential(
        input.matchId,
        credentialId,
      );

      if (
        existing &&
        slot.updatedAt &&
        existing.updatedAt.toISOString() !== slot.updatedAt
      ) {
        throw new AppError(
          "CONFLICT",
          "채점 결과가 다른 곳에서 수정되었습니다. 최신 값을 다시 확인해 주세요.",
        );
      }

      if (existing?.status === JudgeScorecardStatus.locked) {
        throw new AppError("FORBIDDEN", "잠긴 채점표는 수정할 수 없습니다.");
      }

      if (isJudgeSlotEmpty(slot.rounds)) {
        if (existing) {
          await judgeScorecardRepository.deleteByMatchAndCredential(
            input.matchId,
            credentialId,
          );
        }
        continue;
      }

      const rounds = slot.rounds.map((round) => ({
        roundNumber: round.roundNumber,
        redScore: round.redScore,
        blueScore: round.blueScore,
        redKnockdowns: 0,
        blueKnockdowns: 0,
        redDeductions: 0,
        blueDeductions: 0,
        warningMemo: null,
        roundMemo: null,
      }));
      const totals = computeScorecardTotals(rounds);
      const nextStatus =
        existing?.status === JudgeScorecardStatus.submitted ||
        existing?.status === JudgeScorecardStatus.revised
          ? JudgeScorecardStatus.revised
          : JudgeScorecardStatus.submitted;

      await judgeScorecardRepository.upsertDraft({
        eventId: match.bracket.eventId,
        matchId: input.matchId,
        credentialId,
        judgeName: existing?.judgeName ?? `채점심판 ${slot.judgeOrder}`,
        judgeBirthDateSnapshot: existing?.judgeBirthDateSnapshot ?? null,
        judgeRoleSnapshot:
          existing?.judgeRoleSnapshot ?? JudgeCredentialRole.SCORING_JUDGE,
        cornerRedFighterId: match.fighterRed?.id ?? null,
        cornerBlueFighterId: match.fighterBlue?.id ?? null,
        roundCount,
        status: nextStatus,
        redTotal: totals.redTotal,
        blueTotal: totals.blueTotal,
        winnerCorner: totals.winnerCorner,
        decisionMethod: existing?.decisionMethod ?? null,
        memo: existing?.memo ?? null,
        submittedAt: new Date(),
        submittedIp: meta.ip,
        submittedUserAgent: meta.userAgent,
        rounds,
      });
    }

    return this.getEntryForOrganizer(actor, input.matchId);
  },
};
