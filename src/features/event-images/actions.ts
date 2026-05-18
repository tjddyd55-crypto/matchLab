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
import { eventImageService } from "@/lib/services/event-image.service";
import {
  createEventImageSignedUploadUrl,
  EVENT_IMAGE_UPLOAD_EXPIRES_SEC,
} from "@/lib/services/upload.service";

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

export async function requestEventPosterUploadAction(
  formData: FormData,
): Promise<
  ActionResult<{
    uploadUrl: string;
    path: string;
    publicUrl: string;
    expiresIn: number;
  }>
> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const eventId = formReq(formData, "eventId");
    const mimeType = formReq(formData, "mimeType");
    if (!eventId || !mimeType) {
      return actionFailure(
        "VALIDATION_ERROR",
        "대회 ID와 이미지 형식이 필요합니다.",
      );
    }
    const result = await createEventImageSignedUploadUrl(actor, {
      eventId,
      mimeType,
      kind: "poster",
    });
    return actionSuccess({
      ...result,
      expiresIn: EVENT_IMAGE_UPLOAD_EXPIRES_SEC,
    });
  });
}

export async function requestEventGalleryUploadAction(
  formData: FormData,
): Promise<
  ActionResult<{
    uploadUrl: string;
    path: string;
    publicUrl: string;
    expiresIn: number;
  }>
> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const eventId = formReq(formData, "eventId");
    const mimeType = formReq(formData, "mimeType");
    if (!eventId || !mimeType) {
      return actionFailure(
        "VALIDATION_ERROR",
        "대회 ID와 이미지 형식이 필요합니다.",
      );
    }
    const result = await createEventImageSignedUploadUrl(actor, {
      eventId,
      mimeType,
      kind: "gallery",
    });
    return actionSuccess({
      ...result,
      expiresIn: EVENT_IMAGE_UPLOAD_EXPIRES_SEC,
    });
  });
}

export async function finalizeEventPosterUploadAction(
  formData: FormData,
): Promise<ActionResult<{ posterUrl: string }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const eventId = formReq(formData, "eventId");
    const path = formReq(formData, "path");
    if (!eventId || !path) {
      return actionFailure("VALIDATION_ERROR", "업로드 정보가 불완전합니다.");
    }
    const result = await eventImageService.finalizePosterUpload(actor, {
      eventId,
      path,
    });
    return actionSuccess(result);
  });
}

export async function finalizeEventGalleryUploadAction(
  formData: FormData,
): Promise<ActionResult<{ id: string; imageUrl: string }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const eventId = formReq(formData, "eventId");
    const path = formReq(formData, "path");
    const caption = formReq(formData, "caption") || null;
    if (!eventId || !path) {
      return actionFailure("VALIDATION_ERROR", "업로드 정보가 불완전합니다.");
    }
    const result = await eventImageService.finalizeGalleryUpload(actor, {
      eventId,
      path,
      caption,
    });
    return actionSuccess(result);
  });
}

export async function deleteEventGalleryImageAction(
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const imageId = formReq(formData, "imageId");
    if (!imageId) {
      return actionFailure("VALIDATION_ERROR", "이미지 ID가 필요합니다.");
    }
    await eventImageService.deleteGalleryImage(actor, imageId);
    return actionSuccess({ ok: true as const });
  });
}

export async function updateEventGalleryCaptionAction(
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const imageId = formReq(formData, "imageId");
    const caption = formReq(formData, "caption") || null;
    if (!imageId) {
      return actionFailure("VALIDATION_ERROR", "이미지 ID가 필요합니다.");
    }
    await eventImageService.updateGalleryCaption(actor, {
      imageId,
      caption,
    });
    return actionSuccess({ ok: true as const });
  });
}
