"use server";

import {
  actionFailure,
  actionSuccess,
  type ActionResult,
} from "@/lib/action-result";
import { AppError } from "@/lib/errors/app-error";
import { judgeCourtService } from "@/lib/services/judge-court.service";
import type { CourtJudgeMyScorecardVM } from "@/lib/services/judge-court.service";
import { BracketMatchOutcomeStyle, JudgeDecisionMethod } from "@/lib/enums";
import { confirmMatchResultsSchema } from "@/lib/validators/result.validator";

function formReq(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function mapCaught<T>(
  fn: () => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  return fn().catch((e: unknown) => {
    if (e instanceof AppError) return actionFailure(e.code, e.message, e.details);
    console.error(e);
    return actionFailure("INTERNAL", "처리 중 오류가 발생했습니다.");
  });
}

function scoreNumber(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(10, Math.round(n)));
}

type RoundInput = { roundNumber: number; redScore: number; blueScore: number };

function parseRoundsJson(raw: string): RoundInput[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const rounds: RoundInput[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") return null;
      const roundNumber = Number((item as { roundNumber?: unknown }).roundNumber);
      const redScore = scoreNumber((item as { redScore?: unknown }).redScore);
      const blueScore = scoreNumber((item as { blueScore?: unknown }).blueScore);
      if (!Number.isFinite(roundNumber) || redScore == null || blueScore == null) {
        return null;
      }
      rounds.push({ roundNumber, redScore, blueScore });
    }
    return rounds.length > 0 ? rounds : null;
  } catch {
    return null;
  }
}

function parseRoundsFromForm(formData: FormData): RoundInput[] | null {
  const fromJson = parseRoundsJson(formReq(formData, "roundsJson"));
  if (fromJson) return fromJson;

  const roundCount = Number(formReq(formData, "roundCount"));
  if (!Number.isFinite(roundCount) || roundCount < 1) return null;
  const rounds: RoundInput[] = [];
  for (let i = 1; i <= roundCount; i += 1) {
    const redScore = scoreNumber(formData.get(`redScore_${i}`));
    const blueScore = scoreNumber(formData.get(`blueScore_${i}`));
    if (redScore == null || blueScore == null) return null;
    rounds.push({ roundNumber: i, redScore, blueScore });
  }
  return rounds;
}

export async function getMyCourtScorecardAction(
  formData: FormData,
): Promise<ActionResult<{ scorecard: CourtJudgeMyScorecardVM | null }>> {
  return mapCaught(async () => {
    const scorecard = await judgeCourtService.getMyScorecard({
      courtId: formReq(formData, "courtId"),
      matchId: formReq(formData, "matchId"),
      judgeName: formReq(formData, "judgeName"),
      birthDate: formReq(formData, "birthDate"),
    });
    return actionSuccess({ scorecard });
  });
}

export async function submitCourtScorecardAction(
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const rounds = parseRoundsFromForm(formData);
    if (!rounds) {
      return actionFailure("VALIDATION_ERROR", "모든 라운드 점수를 입력해 주세요.");
    }
    const decision = formReq(formData, "decisionMethod");
    await judgeCourtService.submitOpenScorecard({
      courtId: formReq(formData, "courtId"),
      matchId: formReq(formData, "matchId"),
      judgeName: formReq(formData, "judgeName"),
      birthDate: formReq(formData, "birthDate"),
      rounds,
      decisionMethod: decision ? (decision as JudgeDecisionMethod) : null,
      memo: formReq(formData, "memo") || null,
    });
    return actionSuccess({ ok: true as const });
  });
}

export async function headPrepareCourtMatchAction(
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const courtId = formReq(formData, "courtId");
    const matchId = formReq(formData, "matchId");
    if (!matchId) {
      return actionFailure("VALIDATION_ERROR", "경기를 선택해 주세요.");
    }
    await judgeCourtService.prepareMatch(courtId, matchId);
    return actionSuccess({ ok: true as const });
  });
}

export async function headUpdateMatchOperationalSettingsAction(
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const courtId = formReq(formData, "courtId");
    const matchId = formReq(formData, "matchId");
    const roundCount = Number(formReq(formData, "roundCount"));
    const roundTimeSec = Number(formReq(formData, "roundTimeSec"));
    const overtimeEnabled = formReq(formData, "overtimeEnabled") === "true";
    const overtimeRoundCount = Number(formReq(formData, "overtimeRoundCount"));
    if (!matchId || !Number.isFinite(roundCount) || !Number.isFinite(roundTimeSec)) {
      return actionFailure("VALIDATION_ERROR", "라운드 설정을 확인해 주세요.");
    }
    await judgeCourtService.updateOperationalSettings(courtId, matchId, {
      roundCount,
      roundTimeSec,
      overtimeEnabled,
      overtimeRoundCount,
    });
    return actionSuccess({ ok: true as const });
  });
}

export async function headAddOvertimeRoundAction(
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const courtId = formReq(formData, "courtId");
    const matchId = formReq(formData, "matchId");
    if (!matchId) {
      return actionFailure("VALIDATION_ERROR", "경기를 선택해 주세요.");
    }
    await judgeCourtService.addOvertimeRound(courtId, matchId);
    return actionSuccess({ ok: true as const });
  });
}

export async function headStartCourtMatchAction(
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const courtId = formReq(formData, "courtId");
    const matchId = formReq(formData, "matchId");
    if (!matchId) {
      return actionFailure("VALIDATION_ERROR", "시작할 경기를 선택해 주세요.");
    }
    await judgeCourtService.startMatch(courtId, matchId);
    return actionSuccess({ ok: true as const });
  });
}

export async function headCancelCourtMatchAction(
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    await judgeCourtService.cancelMatch(
      formReq(formData, "courtId"),
      formReq(formData, "matchId"),
      formReq(formData, "reason") || null,
    );
    return actionSuccess({ ok: true as const });
  });
}

export async function headCompleteCourtMatchAction(
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const parsed = confirmMatchResultsSchema.safeParse({
      matchId: formReq(formData, "matchId"),
      outcomeMode: formReq(formData, "outcomeMode"),
      winnerId: formReq(formData, "winnerId") || undefined,
      resultType: formReq(formData, "resultType") || BracketMatchOutcomeStyle.decision,
      resultMemo: formReq(formData, "resultMemo") || undefined,
      reason: "경기장 주심판 완료",
    });
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "결과 입력을 확인해 주세요.",
        parsed.error.flatten(),
      );
    }
    await judgeCourtService.completeMatch(formReq(formData, "courtId"), parsed.data);
    return actionSuccess({ ok: true as const });
  });
}
