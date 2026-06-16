"use server";

import {
  actionFailure,
  actionSuccess,
  type ActionResult,
} from "@/lib/action-result";
import { AppError } from "@/lib/errors/app-error";
import { judgeCourtService } from "@/lib/services/judge-court.service";
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

function scoreNumber(formData: FormData, key: string): number {
  const n = Number(formReq(formData, key));
  if (!Number.isFinite(n)) return Number.NaN;
  return Math.max(0, Math.min(10, Math.round(n)));
}

export async function submitCourtScorecardAction(
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const redScore = scoreNumber(formData, "redScore");
    const blueScore = scoreNumber(formData, "blueScore");
    if (!Number.isFinite(redScore) || !Number.isFinite(blueScore)) {
      return actionFailure("VALIDATION_ERROR", "점수를 입력해 주세요.");
    }
    const decision = formReq(formData, "decisionMethod");
    await judgeCourtService.submitOpenScorecard({
      courtId: formReq(formData, "courtId"),
      matchId: formReq(formData, "matchId"),
      judgeName: formReq(formData, "judgeName"),
      birthDate: formReq(formData, "birthDate"),
      redScore,
      blueScore,
      decisionMethod: decision ? (decision as JudgeDecisionMethod) : null,
      memo: formReq(formData, "memo") || null,
    });
    return actionSuccess({ ok: true as const });
  });
}

export async function headStartCourtMatchAction(
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    await judgeCourtService.startCurrentOrNext(formReq(formData, "courtId"));
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
