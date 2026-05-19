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
import { applicationDocumentService } from "@/lib/services/application-document.service";
import { createApplicationDocumentSchema } from "@/lib/validators/application-document.validator";

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

export async function createApplicationDocumentAction(
  arg1: unknown,
  arg2?: FormData,
): Promise<ActionResult<{ documentId: string }>> {
  const formData = resolveFormData(arg1, arg2);
  if (!formData) {
    return actionFailure("VALIDATION_ERROR", "요청 본문이 올바르지 않습니다.");
  }

  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const parsed = createApplicationDocumentSchema.safeParse({
      batchId: formReq(formData, "batchId"),
      fighterId: formReq(formData, "fighterId"),
      divisionId: formReq(formData, "divisionId"),
    });
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        "선수·부문 정보를 확인해 주세요.",
        parsed.error.flatten(),
      );
    }

    const result = await applicationDocumentService.createDocumentForFighter(
      actor,
      parsed.data,
    );
    return actionSuccess(result);
  });
}
