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
  analyzeWeightClassWorkbook,
  buildWeightClassSampleWorkbook,
  WEIGHT_CLASS_EXCEL_MAX_BYTES,
  workbookToBuffer,
  type WeightClassImportPreview,
} from "@/lib/division-template/weight-class-excel";
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

async function readWeightClassExcelFile(formData: FormData): Promise<
  | {
      fileName: string;
      buffer: Buffer;
    }
  | ReturnType<typeof actionFailure>
> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size <= 0) {
    return actionFailure("VALIDATION_ERROR", "Excel 파일을 선택해 주세요.");
  }
  if (file.size > WEIGHT_CLASS_EXCEL_MAX_BYTES) {
    return actionFailure(
      "VALIDATION_ERROR",
      `파일 크기는 최대 ${Math.round(WEIGHT_CLASS_EXCEL_MAX_BYTES / (1024 * 1024))}MB까지 가능합니다.`,
    );
  }
  return {
    fileName: file.name || "import.xlsx",
    buffer: Buffer.from(await file.arrayBuffer()),
  };
}

export async function downloadWeightClassExcelSampleAction(): Promise<
  ActionResult<{ filename: string; base64: string }>
> {
  return mapCaught(async () => {
    await requireActorFromMutation();
    const wb = await buildWeightClassSampleWorkbook({
      includeKickboxingFixture: true,
    });
    const buf = await workbookToBuffer(wb);
    return actionSuccess({
      filename: "MATCHON_체급표_업로드_샘플.xlsx",
      base64: buf.toString("base64"),
    });
  });
}

export async function analyzeWeightClassExcelAction(
  formData: FormData,
): Promise<ActionResult<WeightClassImportPreview>> {
  return mapCaught(async () => {
    const fileResult = await readWeightClassExcelFile(formData);
    if ("ok" in fileResult) {
      return fileResult;
    }

    const sportType = formReq(formData, "sportType");
    const existingItemsRaw = formReq(formData, "existingItemsJson") || "[]";
    let existingItemsJson: unknown;
    try {
      existingItemsJson = JSON.parse(existingItemsRaw) as unknown;
    } catch {
      return actionFailure(
        "VALIDATION_ERROR",
        "기존 체급표 데이터 형식이 올바르지 않습니다.",
      );
    }
    const existingItemsParsed =
      divisionTemplateItemsSchema.safeParse(existingItemsJson);
    if (!existingItemsParsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        "기존 체급표 데이터를 확인해 주세요.",
        existingItemsParsed.error.flatten(),
      );
    }

    await requireActorFromMutation();
    const preview = await analyzeWeightClassWorkbook({
      fileName: fileResult.fileName,
      buffer: fileResult.buffer,
      sportType,
      existingItems: existingItemsParsed.data,
    }).catch((e: unknown) => {
      throw new AppError(
        "VALIDATION_ERROR",
        e instanceof Error
          ? e.message
          : "Excel 파일을 읽을 수 없습니다. 샘플 형식과 파일 내용을 확인해주세요.",
      );
    });
    return actionSuccess(preview);
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
