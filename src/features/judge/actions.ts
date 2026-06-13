"use server";

import {
  actionFailure,
  actionSuccess,
  type ActionResult,
} from "@/lib/action-result";
import { AppError } from "@/lib/errors/app-error";
import { judgeCredentialService } from "@/lib/services/judge-credential.service";
import { judgeScorecardService } from "@/lib/services/judge-scorecard.service";
import {
  confirmJudgeIdentitySchema,
  judgeLoginSchema,
  saveJudgeScorecardSchema,
} from "@/lib/validators/judge.validator";
import { JudgeDecisionMethod } from "@/lib/enums";

function mapJudge<T>(
  fn: () => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  return fn().catch((e: unknown) => {
    if (e instanceof AppError) {
      return actionFailure(e.code, e.message, e.details);
    }
    console.error(e);
    return actionFailure("INTERNAL", "처리 중 오류가 발생했습니다.");
  });
}

function resolveFormData(a: unknown, b?: FormData): FormData | null {
  if (b instanceof FormData) return b;
  if (a instanceof FormData) return a;
  return null;
}

function formReq(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export async function judgeLoginAction(
  arg1: unknown,
  arg2?: FormData,
): Promise<ActionResult<{ redirectTo: string }>> {
  const formData = resolveFormData(arg1, arg2);
  if (!formData) {
    return actionFailure("VALIDATION_ERROR", "요청 본문이 올바르지 않습니다.");
  }

  return mapJudge(async () => {
    const parsed = judgeLoginSchema.safeParse({
      loginId: formReq(formData, "loginId"),
      password: formReq(formData, "password"),
    });
    if (!parsed.success) {
      return actionFailure("VALIDATION_ERROR", "아이디와 비밀번호를 입력해 주세요.");
    }
    const result = await judgeCredentialService.login(parsed.data);
    return actionSuccess(result);
  });
}

export async function judgeLogoutAction(): Promise<ActionResult<{ ok: true }>> {
  return mapJudge(async () => {
    await judgeCredentialService.logout();
    return actionSuccess({ ok: true as const });
  });
}

export async function confirmJudgeIdentityAction(
  arg1: unknown,
  arg2?: FormData,
): Promise<ActionResult<{ redirectTo: string }>> {
  const formData = resolveFormData(arg1, arg2);
  if (!formData) {
    return actionFailure("VALIDATION_ERROR", "요청 본문이 올바르지 않습니다.");
  }

  return mapJudge(async () => {
    const session = await judgeCredentialService.assertJudgeSession();
    const parsed = confirmJudgeIdentitySchema.safeParse({
      verifiedName: formReq(formData, "verifiedName"),
      birthDate: formReq(formData, "birthDate"),
      phone: formReq(formData, "phone") || null,
      organization: formReq(formData, "organization") || null,
    });
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.",
      );
    }
    const result = await judgeCredentialService.confirmIdentity(
      session,
      parsed.data,
    );
    return actionSuccess(result);
  });
}

export async function saveJudgeScorecardAction(
  arg1: unknown,
  arg2?: FormData,
): Promise<ActionResult<{ ok: true }>> {
  const formData = resolveFormData(arg1, arg2);
  if (!formData) {
    return actionFailure("VALIDATION_ERROR", "요청 본문이 올바르지 않습니다.");
  }

  return mapJudge(async () => {
    const session = await judgeCredentialService.assertJudgeSession();
    if (!session.identityConfirmedAt) {
      return actionFailure("FORBIDDEN", "본인 확인 후 채점할 수 있습니다.");
    }

    const roundsJson = formReq(formData, "roundsJson");
    let rounds: unknown;
    try {
      rounds = JSON.parse(roundsJson);
    } catch {
      return actionFailure("VALIDATION_ERROR", "라운드 데이터 형식이 올바르지 않습니다.");
    }

    const decisionRaw = formReq(formData, "decisionMethod");
    const parsed = saveJudgeScorecardSchema.safeParse({
      matchId: formReq(formData, "matchId"),
      judgeName: session.verifiedName ?? formReq(formData, "judgeName"),
      decisionMethod:
        decisionRaw === ""
          ? null
          : (decisionRaw as JudgeDecisionMethod),
      memo: formReq(formData, "memo") || null,
      submit: formReq(formData, "submit") === "true",
      rounds,
    });
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.",
      );
    }

    await judgeScorecardService.saveScorecard(session, parsed.data);
    return actionSuccess({ ok: true as const });
  });
}
