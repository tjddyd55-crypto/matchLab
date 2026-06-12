"use server";

import { revalidatePath } from "next/cache";
import {
  actionFailure,
  actionSuccess,
  permissionReasonToActionCode,
  type ActionResult,
} from "@/lib/action-result";
import { requireActorFromMutation } from "@/lib/auth/actor";
import { PermissionError } from "@/lib/auth/permission-error";
import { AppError } from "@/lib/errors/app-error";
import {
  generateTemporaryJudgePassword,
  judgeCredentialService,
} from "@/lib/services/judge-credential.service";
import { judgeAssignmentService } from "@/lib/services/judge-assignment.service";
import { judgeScorecardService } from "@/lib/services/judge-scorecard.service";
import {
  assignJudgeSchema,
  createJudgeCredentialSchema,
} from "@/lib/validators/judge.validator";

function mapCaught<T>(
  fn: () => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  return fn().catch((e: unknown) => {
    if (e instanceof AppError) {
      return actionFailure(e.code, e.message, e.details);
    }
    if (e instanceof PermissionError) {
      return actionFailure(permissionReasonToActionCode(e.reason), e.message);
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

export async function createJudgeCredentialAction(
  arg1: unknown,
  arg2?: FormData,
): Promise<
  ActionResult<{ loginId: string; plainPassword: string }>
> {
  const formData = resolveFormData(arg1, arg2);
  if (!formData) {
    return actionFailure("VALIDATION_ERROR", "요청 본문이 올바르지 않습니다.");
  }

  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const password =
      formReq(formData, "password") || generateTemporaryJudgePassword();

    const parsed = createJudgeCredentialSchema.safeParse({
      eventId: formReq(formData, "eventId"),
      loginId: formReq(formData, "loginId"),
      password,
      displayName: formReq(formData, "displayName") || undefined,
      memo: formReq(formData, "memo") || undefined,
    });
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.",
      );
    }

    const result = await judgeCredentialService.createCredential(
      actor,
      parsed.data,
    );
    revalidatePath(`/organizer/events/${parsed.data.eventId}/judges`);
    return actionSuccess({
      loginId: result.credential.loginId,
      plainPassword: result.plainPassword,
    });
  });
}

export async function resetJudgePasswordAction(
  arg1: unknown,
  arg2?: FormData,
): Promise<ActionResult<{ plainPassword: string }>> {
  const formData = resolveFormData(arg1, arg2);
  if (!formData) {
    return actionFailure("VALIDATION_ERROR", "요청 본문이 올바르지 않습니다.");
  }

  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const credentialId = formReq(formData, "credentialId");
    if (!credentialId) {
      return actionFailure("VALIDATION_ERROR", "계정 ID가 필요합니다.");
    }
    const result = await judgeCredentialService.resetPassword(
      actor,
      credentialId,
    );
    return actionSuccess(result);
  });
}

export async function setJudgeCredentialActiveAction(
  arg1: unknown,
  arg2?: FormData,
): Promise<ActionResult<{ ok: true }>> {
  const formData = resolveFormData(arg1, arg2);
  if (!formData) {
    return actionFailure("VALIDATION_ERROR", "요청 본문이 올바르지 않습니다.");
  }

  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const credentialId = formReq(formData, "credentialId");
    const isActive = formReq(formData, "isActive") === "true";
    if (!credentialId) {
      return actionFailure("VALIDATION_ERROR", "계정 ID가 필요합니다.");
    }
    await judgeCredentialService.setActive(actor, credentialId, isActive);
    return actionSuccess({ ok: true as const });
  });
}

export async function assignJudgeToMatchAction(
  arg1: unknown,
  arg2?: FormData,
): Promise<ActionResult<{ ok: true }>> {
  const formData = resolveFormData(arg1, arg2);
  if (!formData) {
    return actionFailure("VALIDATION_ERROR", "요청 본문이 올바르지 않습니다.");
  }

  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const parsed = assignJudgeSchema.safeParse({
      eventId: formReq(formData, "eventId"),
      matchId: formReq(formData, "matchId"),
      credentialId: formReq(formData, "credentialId"),
      judgeOrder: Number(formReq(formData, "judgeOrder")),
      isHeadJudge: formReq(formData, "isHeadJudge") === "true",
    });
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.",
      );
    }
    await judgeAssignmentService.assign(actor, parsed.data);
    revalidatePath(`/organizer/events/${parsed.data.eventId}/judges`);
    return actionSuccess({ ok: true as const });
  });
}

export async function getJudgeMatchAggregationAction(
  matchId: string,
): Promise<
  ActionResult<
    Awaited<
      ReturnType<
        typeof judgeScorecardService.getMatchAggregationDetailForOrganizer
      >
    >
  >
> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const data = await judgeScorecardService.getMatchAggregationDetailForOrganizer(
      actor,
      matchId,
    );
    return actionSuccess(data);
  });
}

export async function unassignJudgeFromMatchAction(
  arg1: unknown,
  arg2?: FormData,
): Promise<ActionResult<{ hadSubmittedScorecard: boolean }>> {
  const formData = resolveFormData(arg1, arg2);
  if (!formData) {
    return actionFailure("VALIDATION_ERROR", "요청 본문이 올바르지 않습니다.");
  }

  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const assignmentId = formReq(formData, "assignmentId");
    if (!assignmentId) {
      return actionFailure("VALIDATION_ERROR", "배정 ID가 필요합니다.");
    }
    const result = await judgeAssignmentService.unassign(actor, assignmentId);
    return actionSuccess(result);
  });
}
