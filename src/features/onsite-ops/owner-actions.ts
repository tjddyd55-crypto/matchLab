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
import { revalidatePath } from "next/cache";
import {
  onsiteOpsAccessService,
  type OnsiteOpsLinkOwnerVM,
} from "@/lib/services/onsite-ops-access.service";

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

export async function ensureOnsiteOpsLinkAction(
  formData: FormData,
): Promise<ActionResult<{ link: OnsiteOpsLinkOwnerVM; rawToken: string }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const eventId = formReq(formData, "eventId");
    if (!eventId) {
      return actionFailure("VALIDATION_ERROR", "대회 정보가 올바르지 않습니다.");
    }
    const result = await onsiteOpsAccessService.ensureLink(actor, eventId);
    revalidatePath(`/organizer/events/${eventId}/qr`);
    return actionSuccess(result);
  });
}

export async function rotateOnsiteOpsLinkAction(
  formData: FormData,
): Promise<ActionResult<{ link: OnsiteOpsLinkOwnerVM; rawToken: string }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const eventId = formReq(formData, "eventId");
    if (!eventId) {
      return actionFailure("VALIDATION_ERROR", "대회 정보가 올바르지 않습니다.");
    }
    const result = await onsiteOpsAccessService.rotateLink(actor, eventId);
    revalidatePath(`/organizer/events/${eventId}/qr`);
    return actionSuccess(result);
  });
}

export async function revokeOnsiteOpsLinkAction(
  formData: FormData,
): Promise<ActionResult<{ link: OnsiteOpsLinkOwnerVM }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const eventId = formReq(formData, "eventId");
    if (!eventId) {
      return actionFailure("VALIDATION_ERROR", "대회 정보가 올바르지 않습니다.");
    }
    const link = await onsiteOpsAccessService.revokeLink(actor, eventId);
    revalidatePath(`/organizer/events/${eventId}/qr`);
    return actionSuccess({ link });
  });
}
