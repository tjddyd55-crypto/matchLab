"use server";

import {
  actionFailure,
  actionSuccess,
  type ActionResult,
} from "@/lib/action-result";
import { requireActor } from "@/lib/auth/actor";
import { toActorCaller } from "@/lib/field-operations-auth";
import { AppError } from "@/lib/errors/app-error";
import {
  MATCH_OPS_JUDGE_SLOT_COUNT,
  parseJudgeScoreInput,
} from "@/lib/match-ops-judge-score";
import {
  resolveFieldOpsCallerFromMutation,
  resolveFieldOpsCallerFromToken,
} from "@/lib/onsite-ops/resolve-caller";
import {
  matchOpsJudgeScoreService,
  type MatchOpsJudgeScoreEntryVM,
} from "@/lib/services/match-ops-judge-score.service";

function mapOpsJudge<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  return fn().catch((e: unknown) => {
    if (e instanceof AppError) {
      return actionFailure(e.code, e.message, e.details);
    }
    console.error(e);
    return actionFailure("INTERNAL", "처리 중 오류가 발생했습니다.");
  });
}

export async function getMatchOpsJudgeScoresAction(
  matchId: string,
  opsToken?: string,
): Promise<ActionResult<MatchOpsJudgeScoreEntryVM>> {
  return mapOpsJudge(async () => {
    const caller = opsToken?.trim()
      ? await resolveFieldOpsCallerFromToken(opsToken.trim())
      : toActorCaller(await requireActor());
    const entry = await matchOpsJudgeScoreService.getEntry(caller, matchId);
    return actionSuccess(entry);
  });
}

type ParsedSlot = {
  judgeOrder: number;
  credentialId: string | null;
  updatedAt: string | null;
  rounds: {
    roundNumber: number;
    redScore: number | null;
    blueScore: number | null;
  }[];
};

function parseSlotsJson(raw: string): ParsedSlot[] {
  const parsed = JSON.parse(raw) as ParsedSlot[];
  if (!Array.isArray(parsed) || parsed.length !== MATCH_OPS_JUDGE_SLOT_COUNT) {
    throw new AppError("VALIDATION_ERROR", "채점심판 입력 형식이 올바르지 않습니다.");
  }
  return parsed.map((slot) => ({
    judgeOrder: slot.judgeOrder,
    credentialId: slot.credentialId,
    updatedAt: slot.updatedAt,
    rounds: slot.rounds.map((round) => ({
      roundNumber: round.roundNumber,
      redScore: parseJudgeScoreInput(
        round.redScore == null ? "" : String(round.redScore),
      ),
      blueScore: parseJudgeScoreInput(
        round.blueScore == null ? "" : String(round.blueScore),
      ),
    })),
  }));
}

export async function saveMatchOpsJudgeScoresAction(
  arg1: unknown,
  arg2?: FormData,
): Promise<ActionResult<MatchOpsJudgeScoreEntryVM>> {
  const formData =
    arg2 instanceof FormData
      ? arg2
      : arg1 instanceof FormData
        ? arg1
        : null;
  if (!formData) {
    return actionFailure("VALIDATION_ERROR", "요청 본문이 올바르지 않습니다.");
  }

  return mapOpsJudge(async () => {
    const caller = await resolveFieldOpsCallerFromMutation(formData);
    const matchId = String(formData.get("matchId") ?? "").trim();
    const slotsJson = String(formData.get("slotsJson") ?? "").trim();
    if (!matchId || !slotsJson) {
      throw new AppError("VALIDATION_ERROR", "채점심판 입력이 올바르지 않습니다.");
    }

    const slots = parseSlotsJson(slotsJson);
    const entry = await matchOpsJudgeScoreService.saveSlots(caller, {
      matchId,
      slots,
    });
    return actionSuccess(entry);
  });
}
