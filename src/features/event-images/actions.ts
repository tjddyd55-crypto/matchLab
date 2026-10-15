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
      const message =
        e.reason === "UNAUTHORIZED"
          ? "로그인이 필요합니다."
          : e.reason === "NOT_FOUND"
            ? e.message || "대회를 찾을 수 없습니다."
            : e.reason === "FORBIDDEN"
              ? "이 대회 이미지를 업로드할 권한이 없습니다."
              : e.message;
      return actionFailure(permissionReasonToActionCode(e.reason), message);
    }
    if (e instanceof Error) {
      if (e.message.includes("NEXT_PUBLIC_SUPABASE_URL")) {
        return actionFailure(
          "INTERNAL",
          "NEXT_PUBLIC_SUPABASE_URL이 설정되지 않았습니다. Railway Variables를 확인하세요.",
        );
      }
      if (e.message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
        return actionFailure(
          "INTERNAL",
          "SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다. Storage signed URL 발급에 필요합니다.",
        );
      }
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
