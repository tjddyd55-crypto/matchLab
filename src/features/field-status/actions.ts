"use server";

import { revalidatePath } from "next/cache";
import {
  actionFailure,
  actionSuccess,
  permissionReasonToActionCode,
  type ActionResult,
} from "@/lib/action-result";
import { PermissionError } from "@/lib/auth/permission-error";
import { requireActorFromMutation } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import { fieldStatusService } from "@/lib/services/field-status.service";
import {
  applyFieldBracketOutcomeSchema,
  recordWeighInWeightSchema,
  saveFieldMemoSchema,
  setCheckInStatusSchema,
  setWeighInStatusSchema,
} from "@/lib/validators/field-status.validator";
import { BracketMatchOutcomeStyle } from "@/generated/prisma";
import { fieldStatusRepository } from "@/lib/repositories/field-status.repository";

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

function formReq(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

async function revalidateFieldStatusPaths(applicationId: string): Promise<void> {
  const row = await fieldStatusRepository.findApprovedApplicationById(
    applicationId,
  );
  if (!row) return;
  revalidatePath(`/organizer/events/${row.eventId}/check-in`);
  revalidatePath(`/gym/events/${row.eventId}/field-status`);
  revalidatePath(`/organizer/events/${row.eventId}/brackets`);
  revalidatePath(
    `/organizer/events/${row.eventId}/brackets`,
    "layout",
  );
}

export async function setCheckInStatusFormAction(
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const parsed = setCheckInStatusSchema.safeParse({
      applicationId: formReq(formData, "applicationId"),
      status: formReq(formData, "status"),
    });
    if (!parsed.success) {
      return actionFailure("VALIDATION_ERROR", "입력값을 확인해 주세요.");
    }
    await fieldStatusService.setCheckInStatus(
      actor,
      parsed.data.applicationId,
      parsed.data.status,
    );
    await revalidateFieldStatusPaths(parsed.data.applicationId);
    return actionSuccess({ ok: true });
  });
}

export async function setWeighInStatusFormAction(
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const parsed = setWeighInStatusSchema.safeParse({
      applicationId: formReq(formData, "applicationId"),
      status: formReq(formData, "status"),
    });
    if (!parsed.success) {
      return actionFailure("VALIDATION_ERROR", "입력값을 확인해 주세요.");
    }
    await fieldStatusService.setWeighInStatus(
      actor,
      parsed.data.applicationId,
      parsed.data.status,
    );
    await revalidateFieldStatusPaths(parsed.data.applicationId);
    return actionSuccess({ ok: true });
  });
}

export async function recordWeighInWeightFormAction(
  formData: FormData,
): Promise<ActionResult<{ evaluationReason: string }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const parsed = recordWeighInWeightSchema.safeParse({
      applicationId: formReq(formData, "applicationId"),
      weightKg: formReq(formData, "weightKg"),
    });
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "몸무게를 확인해 주세요.",
      );
    }
    const result = await fieldStatusService.recordWeighInWeight(
      actor,
      parsed.data.applicationId,
      parsed.data.weightKg,
    );
    await revalidateFieldStatusPaths(parsed.data.applicationId);
    return actionSuccess({ evaluationReason: result.evaluationReason });
  });
}

export async function saveFieldMemoFormAction(
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const parsed = saveFieldMemoSchema.safeParse({
      applicationId: formReq(formData, "applicationId"),
      memo: formReq(formData, "memo") || null,
    });
    if (!parsed.success) {
      return actionFailure("VALIDATION_ERROR", "메모를 확인해 주세요.");
    }
    await fieldStatusService.saveFieldMemo(
      actor,
      parsed.data.applicationId,
      parsed.data.memo,
    );
    await revalidateFieldStatusPaths(parsed.data.applicationId);
    return actionSuccess({ ok: true });
  });
}

export async function checkInActionFormAction(
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  formData.set("status", "checked_in");
  return setCheckInStatusFormAction(formData);
}

export async function markNoShowFormAction(
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  formData.set("status", "no_show");
  return setCheckInStatusFormAction(formData);
}

export async function markWithdrawnFormAction(
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  formData.set("status", "withdrawn");
  return setCheckInStatusFormAction(formData);
}

export async function markDisqualifiedFormAction(
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  formData.set("status", "disqualified");
  return setCheckInStatusFormAction(formData);
}

export async function weighInPassFormAction(
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  formData.set("status", "pass");
  return setWeighInStatusFormAction(formData);
}

export async function weighInFailFormAction(
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  formData.set("status", "fail");
  return setWeighInStatusFormAction(formData);
}

export async function weighInManualPassFormAction(
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  formData.set("status", "manual_pass");
  return setWeighInStatusFormAction(formData);
}

export async function weighInManualFailFormAction(
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  formData.set("status", "manual_fail");
  return setWeighInStatusFormAction(formData);
}

/** `<form action>` 용 — 반환 타입을 `void`로 맞춘다. */
export async function setCheckInStatusFormActionVoid(
  formData: FormData,
): Promise<void> {
  await setCheckInStatusFormAction(formData);
}

export async function setWeighInStatusFormActionVoid(
  formData: FormData,
): Promise<void> {
  await setWeighInStatusFormAction(formData);
}

export async function recordWeighInWeightFormActionVoid(
  formData: FormData,
): Promise<void> {
  await recordWeighInWeightFormAction(formData);
}

export async function saveFieldMemoFormActionVoid(
  formData: FormData,
): Promise<void> {
  await saveFieldMemoFormAction(formData);
}

export async function checkInActionFormActionVoid(
  formData: FormData,
): Promise<void> {
  await checkInActionFormAction(formData);
}

export async function markNoShowFormActionVoid(
  formData: FormData,
): Promise<void> {
  await markNoShowFormAction(formData);
}

export async function markWithdrawnFormActionVoid(
  formData: FormData,
): Promise<void> {
  await markWithdrawnFormAction(formData);
}

export async function markDisqualifiedFormActionVoid(
  formData: FormData,
): Promise<void> {
  await markDisqualifiedFormAction(formData);
}

export async function weighInPassFormActionVoid(
  formData: FormData,
): Promise<void> {
  await weighInPassFormAction(formData);
}

export async function weighInFailFormActionVoid(
  formData: FormData,
): Promise<void> {
  await weighInFailFormAction(formData);
}

export async function weighInManualPassFormActionVoid(
  formData: FormData,
): Promise<void> {
  await weighInManualPassFormAction(formData);
}

export async function quickConfirmEligibilityFormAction(
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const applicationId = formReq(formData, "applicationId");
    if (!applicationId) {
      return actionFailure("VALIDATION_ERROR", "신청 정보가 없습니다.");
    }
    await fieldStatusService.quickConfirmEligibility(actor, applicationId);
    await revalidateFieldStatusPaths(applicationId);
    return actionSuccess({ ok: true });
  });
}

export async function quickConfirmEligibilityFormActionVoid(
  formData: FormData,
): Promise<void> {
  await quickConfirmEligibilityFormAction(formData);
}

export async function weighInManualFailFormActionVoid(
  formData: FormData,
): Promise<void> {
  await weighInManualFailFormAction(formData);
}

export async function applyFieldBracketOutcomeFormAction(
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const resultTypeRaw = formReq(formData, "resultType");
    const parsed = applyFieldBracketOutcomeSchema.safeParse({
      matchId: formReq(formData, "matchId"),
      loserFighterId: formReq(formData, "loserFighterId"),
      resultType: resultTypeRaw as BracketMatchOutcomeStyle,
      confirmOfficial: formReq(formData, "confirmOfficial") !== "false",
      resultMemo: formReq(formData, "resultMemo") || null,
    });
    if (!parsed.success) {
      return actionFailure("VALIDATION_ERROR", "패 처리 입력값을 확인해 주세요.");
    }
    await fieldStatusService.applyFieldBracketOutcome(actor, parsed.data);
    const row = await fieldStatusRepository.findApprovedApplicationById(
      formReq(formData, "applicationId"),
    );
    if (row) {
      revalidatePath(`/organizer/events/${row.eventId}/check-in`);
      revalidatePath(`/organizer/events/${row.eventId}/operation`);
      revalidatePath(`/organizer/events/${row.eventId}/brackets`);
    }
    return actionSuccess({ ok: true });
  });
}

export async function applyFieldBracketOutcomeFormActionVoid(
  formData: FormData,
): Promise<void> {
  await applyFieldBracketOutcomeFormAction(formData);
}
