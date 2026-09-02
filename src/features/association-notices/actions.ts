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
import { associationNoticeService } from "@/lib/services/association-notice.service";
import { associationNoticeUpsertSchema } from "@/lib/validators/association-notice.validator";

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

function formStr(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function revalidateAssociationNoticePaths(noticeId?: string) {
  revalidatePath("/organizer/notices");
  if (noticeId) {
    revalidatePath(`/organizer/notices/${noticeId}`);
    revalidatePath(`/organizer/notices/${noticeId}/edit`);
  }
  revalidatePath("/gym", "layout");
}

export async function createAssociationNoticeAction(
  formData: FormData,
): Promise<ActionResult<{ noticeId: string }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const parsed = associationNoticeUpsertSchema.safeParse({
      title: formStr(formData, "title"),
      content: formStr(formData, "content"),
      isPinned: formData.get("isPinned") === "true" || formData.get("isPinned") === "on",
      relatedFormId: formStr(formData, "relatedFormId") || null,
    });
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.",
      );
    }
    const created = await associationNoticeService.create(actor, parsed.data);
    revalidateAssociationNoticePaths(created.id);
    return actionSuccess({ noticeId: created.id });
  });
}

export async function updateAssociationNoticeAction(
  noticeId: string,
  formData: FormData,
): Promise<ActionResult<{ noticeId: string }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const parsed = associationNoticeUpsertSchema.safeParse({
      title: formStr(formData, "title"),
      content: formStr(formData, "content"),
      isPinned: formData.get("isPinned") === "true" || formData.get("isPinned") === "on",
      relatedFormId: formStr(formData, "relatedFormId") || null,
    });
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.",
      );
    }
    await associationNoticeService.update(actor, noticeId, parsed.data);
    revalidateAssociationNoticePaths(noticeId);
    return actionSuccess({ noticeId });
  });
}

export async function deleteAssociationNoticeAction(
  noticeId: string,
): Promise<ActionResult<{ noticeId: string }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    await associationNoticeService.delete(actor, noticeId);
    revalidateAssociationNoticePaths(noticeId);
    return actionSuccess({ noticeId });
  });
}
