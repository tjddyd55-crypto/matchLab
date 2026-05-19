"use server";

import { z } from "zod";
import {
  actionFailure,
  actionSuccess,
  permissionReasonToActionCode,
  type ActionResult,
} from "@/lib/action-result";
import { requireActorFromMutation } from "@/lib/auth/actor";
import { PermissionError } from "@/lib/auth/permission-error";
import { AppError } from "@/lib/errors/app-error";
import { applicationFormTemplateService } from "@/lib/services/application-form-template.service";
import {
  createApplicationFormTemplateSchema,
  linkEventApplicationFormTemplateSchema,
  updateApplicationFormTemplateSchema,
  pdfFieldSchema,
  pdfRepeatGroupSchema,
} from "@/lib/validators/application-form-template.validator";

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

function formBool(formData: FormData, key: string): boolean {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

function parseJsonArray(raw: string, label: string): unknown {
  try {
    return JSON.parse(raw || "[]") as unknown;
  } catch {
    throw new AppError("VALIDATION_ERROR", `${label} JSON 형식이 올바르지 않습니다.`);
  }
}

export async function createApplicationFormTemplateAction(
  arg1: unknown,
  arg2?: FormData,
): Promise<ActionResult<{ templateId: string }>> {
  const formData = resolveFormData(arg1, arg2);
  if (!formData) {
    return actionFailure("VALIDATION_ERROR", "요청 본문이 올바르지 않습니다.");
  }

  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const fieldsParsed = parseFieldsJson(formReq(formData, "fieldsJson"));
    const repeatParsed = parseRepeatGroupsJson(
      formReq(formData, "repeatGroupsJson"),
    );

    const parsed = createApplicationFormTemplateSchema.safeParse({
      organizerId: formReq(formData, "organizerId") || undefined,
      title: formReq(formData, "title"),
      description: formReq(formData, "description") || null,
      originalPdfPath: formReq(formData, "originalPdfPath"),
      originalPdfFileName: formReq(formData, "originalPdfFileName"),
      fieldsJson: fieldsParsed,
      repeatGroupsJson: repeatParsed,
      manualFieldsJson: optionalJson(formReq(formData, "manualFieldsJson")),
      consentMappingJson: optionalJson(formReq(formData, "consentMappingJson")),
      isActive: formBool(formData, "isActive"),
    });
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        "템플릿 정보를 확인해 주세요.",
        parsed.error.flatten(),
      );
    }

    const result = await applicationFormTemplateService.createTemplate(
      actor,
      parsed.data,
    );
    return actionSuccess(result);
  });
}

export async function updateApplicationFormTemplateAction(
  arg1: unknown,
  arg2?: FormData,
): Promise<ActionResult<{ ok: true }>> {
  const formData = resolveFormData(arg1, arg2);
  if (!formData) {
    return actionFailure("VALIDATION_ERROR", "요청 본문이 올바르지 않습니다.");
  }

  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const templateId = formReq(formData, "templateId");

    const fieldsRaw = formReq(formData, "fieldsJson");
    const repeatRaw = formReq(formData, "repeatGroupsJson");

    const parsed = updateApplicationFormTemplateSchema.safeParse({
      templateId,
      organizerId: formReq(formData, "organizerId") || null,
      title: formReq(formData, "title"),
      description: formReq(formData, "description") || null,
      originalPdfPath: formReq(formData, "originalPdfPath"),
      originalPdfFileName: formReq(formData, "originalPdfFileName"),
      fieldsJson: fieldsRaw ? parseFieldsJson(fieldsRaw) : undefined,
      repeatGroupsJson: repeatRaw ? parseRepeatGroupsJson(repeatRaw) : undefined,
      manualFieldsJson: optionalJson(formReq(formData, "manualFieldsJson")),
      consentMappingJson: optionalJson(formReq(formData, "consentMappingJson")),
      isActive: formBool(formData, "isActive"),
    });
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        "입력값을 확인해 주세요.",
        parsed.error.flatten(),
      );
    }

    await applicationFormTemplateService.updateTemplate(actor, parsed.data);
    return actionSuccess({ ok: true as const });
  });
}

export async function linkEventApplicationFormTemplateAction(
  arg1: unknown,
  arg2?: FormData,
): Promise<ActionResult<{ ok: true }>> {
  const formData = resolveFormData(arg1, arg2);
  if (!formData) {
    return actionFailure("VALIDATION_ERROR", "요청 본문이 올바르지 않습니다.");
  }

  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const templateRaw = formReq(formData, "applicationFormTemplateId");
    const parsed = linkEventApplicationFormTemplateSchema.safeParse({
      eventId: formReq(formData, "eventId"),
      applicationFormTemplateId: templateRaw === "" ? null : templateRaw,
    });
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        "요청 값을 확인해 주세요.",
        parsed.error.flatten(),
      );
    }

    await applicationFormTemplateService.linkTemplateToEvent(actor, parsed.data);
    return actionSuccess({ ok: true as const });
  });
}

function optionalJson(raw: string): unknown | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    return JSON.parse(t) as unknown;
  } catch {
    throw new AppError("VALIDATION_ERROR", "JSON 형식이 올바르지 않습니다.");
  }
}

function parseFieldsJson(raw: string) {
  const parsed = z.array(pdfFieldSchema).safeParse(parseJsonArray(raw, "필드"));
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", "필드 정의를 확인해 주세요.");
  }
  return parsed.data;
}

function parseRepeatGroupsJson(raw: string) {
  const parsed = z
    .array(pdfRepeatGroupSchema)
    .safeParse(parseJsonArray(raw, "반복 그룹"));
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", "반복 그룹을 확인해 주세요.");
  }
  return parsed.data;
}
