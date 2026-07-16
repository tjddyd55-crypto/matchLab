import "server-only";

import { randomUUID } from "node:crypto";
import { AppError } from "@/lib/errors/app-error";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  buildPublicStorageUrlForEventImages,
  EVENT_IMAGE_UPLOAD_EXPIRES_SEC,
} from "@/lib/services/upload.service";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;

function eventImagesBucket(): string {
  return process.env.SUPABASE_EVENT_IMAGE_BUCKET?.trim() || "event-images";
}

function extForMime(mimeType: string): "jpg" | "png" | "webp" {
  const m = mimeType.trim();
  if (m === "image/jpeg") return "jpg";
  if (m === "image/png") return "png";
  if (m === "image/webp") return "webp";
  throw new AppError(
    "VALIDATION_ERROR",
    "허용되지 않는 이미지 형식입니다. JPEG, PNG, WebP만 가능합니다.",
  );
}

/**
 * 공개 파트너/협회 로고 — event-images 버킷, 명확한 path prefix.
 * - public-partners/{id}/logo/{uuid}.ext
 * - organizers/{id}/public-logo/{uuid}.ext
 */
export async function createPublicLogoSignedUploadUrl(input: {
  mimeType: string;
  kind: "public-partner" | "organizer-public-logo";
  ownerId: string;
}): Promise<{ uploadUrl: string; path: string; publicUrl: string }> {
  const mimeType = input.mimeType.trim();
  if (!ALLOWED.has(mimeType)) {
    throw new AppError("VALIDATION_ERROR", "허용되지 않는 이미지 형식입니다.");
  }
  const ext = extForMime(mimeType);
  const path =
    input.kind === "public-partner"
      ? `public-partners/${input.ownerId}/logo/${randomUUID()}.${ext}`
      : `organizers/${input.ownerId}/public-logo/${randomUUID()}.${ext}`;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(eventImagesBucket())
    .createSignedUploadUrl(path, { upsert: true });

  if (error || !data?.signedUrl) {
    throw new AppError(
      "INTERNAL",
      "업로드 URL 발급에 실패했습니다.",
      error?.message,
    );
  }

  return {
    uploadUrl: data.signedUrl,
    path,
    publicUrl: buildPublicStorageUrlForEventImages(path),
  };
}

export function assertPublicPartnerLogoPath(path: string) {
  if (!path.startsWith("public-partners/")) {
    throw new AppError("VALIDATION_ERROR", "로고 경로가 올바르지 않습니다.");
  }
}

export function assertOrganizerPublicLogoPath(path: string) {
  if (!path.startsWith("organizers/") || !path.includes("/public-logo/")) {
    throw new AppError("VALIDATION_ERROR", "로고 경로가 올바르지 않습니다.");
  }
}

export {
  buildPublicStorageUrlForEventImages,
  EVENT_IMAGE_UPLOAD_EXPIRES_SEC,
  MAX_BYTES as PUBLIC_LOGO_MAX_BYTES,
};
