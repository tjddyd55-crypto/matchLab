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
import { eventStaffAccessService } from "@/lib/services/event-staff-access.service";

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

function parsePermissionBool(formData: FormData, key: string): boolean {
  return formReq(formData, key) === "true";
}

export async function createStaffRecorderLinkAction(
  arg1: unknown,
  arg2?: FormData,
): Promise<ActionResult<{ token: string; urlPath: string }>> {
  const formData = resolveFormData(arg1, arg2);
  if (!formData) {
    return actionFailure("VALIDATION_ERROR", "요청 본문이 올바르지 않습니다.");
  }

  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const eventId = formReq(formData, "eventId");
    const label = formReq(formData, "label");
    const expiresRaw = formReq(formData, "expiresAt");
    if (!eventId || !label) {
      return actionFailure("VALIDATION_ERROR", "대회와 라벨을 입력해 주세요.");
    }

    const expiresAt =
      expiresRaw === ""
        ? null
        : (() => {
            const d = new Date(expiresRaw);
            if (Number.isNaN(d.getTime())) {
              throw new AppError(
                "VALIDATION_ERROR",
                "만료일시 형식이 올바르지 않습니다.",
              );
            }
            return d;
          })();

    const created = await eventStaffAccessService.createRecorderLink(actor, {
      eventId,
      label,
      expiresAt,
      accessCode: formReq(formData, "accessCode") || null,
      canChangeMatchStatus: parsePermissionBool(
        formData,
        "canChangeMatchStatus",
      ),
      canRecordOutcomeDraft: parsePermissionBool(
        formData,
        "canRecordOutcomeDraft",
      ),
      canConfirmResult: parsePermissionBool(formData, "canConfirmResult"),
    });

    return actionSuccess(created);
  });
}

export async function revokeStaffRecorderLinkAction(
  arg1: unknown,
  arg2?: FormData,
): Promise<ActionResult<{ ok: true }>> {
  const formData = resolveFormData(arg1, arg2);
  if (!formData) {
    return actionFailure("VALIDATION_ERROR", "요청 본문이 올바르지 않습니다.");
  }

  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const linkId = formReq(formData, "linkId");
    if (!linkId) {
      return actionFailure("VALIDATION_ERROR", "링크 ID가 필요합니다.");
    }
    await eventStaffAccessService.revokeLink(actor, linkId);
    return actionSuccess({ ok: true as const });
  });
}
