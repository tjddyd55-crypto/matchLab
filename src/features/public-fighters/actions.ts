"use server";

import {
  actionFailure,
  actionSuccess,
  permissionReasonToActionCode,
  type ActionResult,
} from "@/lib/action-result";
import { PermissionError } from "@/lib/auth/permission-error";
import { requireActorFromMutation } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import { publicFighterService } from "@/lib/services/public-fighter.service";
import { gymTogglePublicFighterSchema } from "@/lib/validators/public-fighter.validator";

function mapCaught<T>(
  fn: () => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  return fn().catch((e: unknown) => {
    if (e instanceof AppError) {
      return actionFailure(e.code, e.message, e.details);
    }
    if (e instanceof PermissionError) {
      return actionFailure(
        permissionReasonToActionCode(e.reason),
        e.message,
      );
    }
    console.error(e);
    return actionFailure("INTERNAL", "처리 중 오류가 발생했습니다.");
  });
}

function formReq(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export async function gymTogglePublicFighterAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<{ isPublic: boolean }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const parsed = gymTogglePublicFighterSchema.safeParse({
      fighterId: formReq(formData, "fighterId"),
      isPublic: formReq(formData, "isPublic"),
      publicMemo: formReq(formData, "publicMemo") || undefined,
    });
    if (!parsed.success) {
      return actionFailure("VALIDATION_ERROR", "입력값을 확인해 주세요.");
    }

    await publicFighterService.gymTogglePublicFighter(actor, {
      fighterId: parsed.data.fighterId,
      isPublic: parsed.data.isPublic === "true",
      publicMemo: parsed.data.publicMemo,
    });

    return actionSuccess({ isPublic: parsed.data.isPublic === "true" });
  });
}
