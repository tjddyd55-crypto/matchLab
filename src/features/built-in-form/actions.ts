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
import { applicationFormTemplateService } from "@/lib/services/application-form-template.service";
import {
  saveBuiltInFormFieldsSchema,
  updateEventApplicationFormModeSchema,
} from "@/lib/validators/built-in-form.validator";
import { ApplicationFormMode } from "@/generated/prisma";

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

export async function updateEventApplicationFormModeAction(
  formData: FormData,
): Promise<ActionResult<{ templateId: string | null }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const parsed = updateEventApplicationFormModeSchema.safeParse({
      eventId: formReq(formData, "eventId"),
      applicationFormMode: formReq(formData, "applicationFormMode"),
    });
    if (!parsed.success) {
      return actionFailure("VALIDATION_ERROR", "신청 방식을 확인해 주세요.");
    }
    const result = await applicationFormTemplateService.updateEventApplicationFormMode(
      actor,
      parsed.data.eventId,
      parsed.data.applicationFormMode as ApplicationFormMode,
    );
    revalidatePath(`/organizer/events/${parsed.data.eventId}`);
    return actionSuccess(result);
  });
}

export async function saveBuiltInFormFieldsAction(
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    let fields: unknown;
    try {
      fields = JSON.parse(formReq(formData, "fieldsJson"));
    } catch {
      return actionFailure("VALIDATION_ERROR", "폼 항목 JSON을 확인해 주세요.");
    }
    const parsed = saveBuiltInFormFieldsSchema.safeParse({
      eventId: formReq(formData, "eventId"),
      title: formReq(formData, "title") || undefined,
      fields,
    });
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "폼 항목을 확인해 주세요.",
      );
    }
    await applicationFormTemplateService.saveBuiltInFormFieldsForEvent(
      actor,
      parsed.data.eventId,
      parsed.data.fields,
      parsed.data.title,
    );
    revalidatePath(`/organizer/events/${parsed.data.eventId}`);
    return actionSuccess({ ok: true as const });
  });
}

export async function loadDefaultBuiltInFormAction(
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const eventId = formReq(formData, "eventId");
    if (!eventId) {
      return actionFailure("VALIDATION_ERROR", "대회 ID가 필요합니다.");
    }
    await applicationFormTemplateService.loadDefaultBuiltInFormFieldsForEvent(
      actor,
      eventId,
    );
    revalidatePath(`/organizer/events/${eventId}`);
    return actionSuccess({ ok: true as const });
  });
}

export async function updateEventApplicationFormModeActionVoid(
  formData: FormData,
): Promise<void> {
  await updateEventApplicationFormModeAction(formData);
}

export async function saveBuiltInFormFieldsActionVoid(
  formData: FormData,
): Promise<void> {
  await saveBuiltInFormFieldsAction(formData);
}

export async function loadDefaultBuiltInFormActionVoid(
  formData: FormData,
): Promise<void> {
  await loadDefaultBuiltInFormAction(formData);
}
