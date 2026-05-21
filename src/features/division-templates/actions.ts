"use server";

import {
  actionFailure,
  actionSuccess,
  permissionReasonToActionCode,
  type ActionResult,
} from "@/lib/action-result";
import { requireActorFromMutation } from "@/lib/auth/actor";
import { PermissionError } from "@/lib/auth/permission-error";
import { AppError } from "@/lib/errors/app-error";
import { divisionTemplateService } from "@/lib/services/division-template.service";
import {
  applyDivisionTemplateSchema,
  createDivisionTemplateSchema,
  deleteDivisionTemplateSchema,
  divisionTemplateItemsSchema,
  updateDivisionTemplateSchema,
} from "@/lib/validators/division-template.validator";

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

function parseItemsJson(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new AppError(
      "VALIDATION_ERROR",
      "체급표 항목 JSON 형식이 올바르지 않습니다.",
    );
  }
}

export async function createDivisionTemplateAction(
  arg1: unknown,
  arg2?: FormData,
): Promise<ActionResult<{ templateId: string }>> {
  const formData = resolveFormData(arg1, arg2);
  if (!formData) {
    return actionFailure("VALIDATION_ERROR", "요청 본문이 올바르지 않습니다.");
  }

  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const itemsRaw = formReq(formData, "itemsJson");
    const itemsParsed = divisionTemplateItemsSchema.safeParse(
      parseItemsJson(itemsRaw || "[]"),
    );
    if (!itemsParsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        "체급표 항목을 확인해 주세요.",
        itemsParsed.error.flatten(),
      );
    }

    const parsed = createDivisionTemplateSchema.safeParse({
      organizerId: formReq(formData, "organizerId") || undefined,
      title: formReq(formData, "title"),
      sportType: formReq(formData, "sportType") || null,
      description: formReq(formData, "description") || null,
      isActive: formBool(formData, "isActive"),
      items: itemsParsed.data,
    });
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        "템플릿 정보를 확인해 주세요.",
        parsed.error.flatten(),
      );
    }

    const result = await divisionTemplateService.createTemplate(
      actor,
      parsed.data,
    );
    return actionSuccess(result);
  });
}

export async function updateDivisionTemplateAction(
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

    const patch: {
      templateId: string;
      title?: string;
      sportType?: string | null;
      description?: string | null;
      isActive?: boolean;
      items?: unknown[];
    } = { templateId };

    if (formData.has("title")) patch.title = formReq(formData, "title");
    if (formData.has("sportType")) {
      patch.sportType = formReq(formData, "sportType") || null;
    }
    if (formData.has("description")) {
      patch.description = formReq(formData, "description") || null;
    }
    if (formData.has("isActive")) {
      patch.isActive = formBool(formData, "isActive");
    }
    if (formData.has("itemsJson")) {
      const itemsParsed = divisionTemplateItemsSchema.safeParse(
        parseItemsJson(formReq(formData, "itemsJson")),
      );
      if (!itemsParsed.success) {
        return actionFailure(
          "VALIDATION_ERROR",
          "체급표 항목을 확인해 주세요.",
          itemsParsed.error.flatten(),
        );
      }
      patch.items = itemsParsed.data;
    }

    const parsed = updateDivisionTemplateSchema.safeParse(patch);
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        "입력값을 확인해 주세요.",
        parsed.error.flatten(),
      );
    }

    await divisionTemplateService.updateTemplate(actor, parsed.data);
    return actionSuccess({ ok: true as const });
  });
}

export async function deleteDivisionTemplateAction(
  arg1: unknown,
  arg2?: FormData,
): Promise<ActionResult<{ ok: true }>> {
  const formData = resolveFormData(arg1, arg2);
  if (!formData) {
    return actionFailure("VALIDATION_ERROR", "요청 본문이 올바르지 않습니다.");
  }

  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const parsed = deleteDivisionTemplateSchema.safeParse({
      templateId: formReq(formData, "templateId"),
    });
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        "템플릿 정보가 올바르지 않습니다.",
        parsed.error.flatten(),
      );
    }

    await divisionTemplateService.deleteTemplate(
      actor,
      parsed.data.templateId,
    );
    return actionSuccess({ ok: true as const });
  });
}

export async function applyDivisionTemplateToEventAction(
  arg1: unknown,
  arg2?: FormData,
): Promise<
  ActionResult<{ created: number; skippedDuplicates: number; removed: number }>
> {
  const formData = resolveFormData(arg1, arg2);
  if (!formData) {
    return actionFailure("VALIDATION_ERROR", "요청 본문이 올바르지 않습니다.");
  }

  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const modeRaw = formReq(formData, "mode") || "append_skip";
    const parsed = applyDivisionTemplateSchema.safeParse({
      eventId: formReq(formData, "eventId"),
      templateId: formReq(formData, "templateId"),
      mode: modeRaw,
    });
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        "요청 값을 확인해 주세요.",
        parsed.error.flatten(),
      );
    }

    const result = await divisionTemplateService.applyTemplateToEvent(
      actor,
      parsed.data,
    );
    return actionSuccess(result);
  });
}
