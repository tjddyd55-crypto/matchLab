import "server-only";

import { randomUUID } from "node:crypto";
import { AppError } from "@/lib/errors/app-error";
import { GymApplicationAttachmentType } from "@/lib/enums";
import {
  MEMBER_GYM_ALLOWED_DOCUMENT_MIME,
  MEMBER_GYM_ALLOWED_IMAGE_MIME,
  MEMBER_GYM_DOCUMENT_MAX_BYTES,
  MEMBER_GYM_IMAGE_MAX_BYTES,
  MEMBER_GYM_UPLOAD_EXPIRES_SEC,
  memberGymFilesBucket,
} from "@/lib/member-gym/constants";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const PATH_PREFIX = "gym-applications/";

function assertMimeAndSize(mimeType: string, sizeBytes: number) {
  const isImage = MEMBER_GYM_ALLOWED_IMAGE_MIME.has(mimeType);
  const isDoc = MEMBER_GYM_ALLOWED_DOCUMENT_MIME.has(mimeType);
  if (!isImage && !isDoc) {
    throw new AppError(
      "VALIDATION_ERROR",
      "허용되지 않는 파일 형식입니다. (JPEG/PNG/WebP/PDF)",
    );
  }
  const max = isImage ? MEMBER_GYM_IMAGE_MAX_BYTES : MEMBER_GYM_DOCUMENT_MAX_BYTES;
  if (sizeBytes > max) {
    throw new AppError(
      "VALIDATION_ERROR",
      `파일 크기는 최대 ${Math.floor(max / (1024 * 1024))}MB까지입니다.`,
    );
  }
}

function extFromMime(mimeType: string): string {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "application/pdf") return "pdf";
  return "bin";
}

export const gymApplicationUploadService = {
  async issueUploadUrl(input: {
    uploadBatchId: string;
    attachmentType: GymApplicationAttachmentType;
    mimeType: string;
    sizeBytes: number;
    originalFileName: string;
  }) {
    assertMimeAndSize(input.mimeType, input.sizeBytes);
    if (
      !Object.values(GymApplicationAttachmentType).includes(input.attachmentType)
    ) {
      throw new AppError("VALIDATION_ERROR", "첨부 유형이 올바르지 않습니다.");
    }
    const batch = input.uploadBatchId.trim() || randomUUID();
    const ext = extFromMime(input.mimeType);
    const storagePath = `${PATH_PREFIX}${batch}/${input.attachmentType}-${randomUUID()}.${ext}`;
    const bucket = memberGymFilesBucket();
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(storagePath, {
        upsert: false,
      });
    if (error || !data) {
      throw new AppError(
        "INTERNAL",
        "업로드 URL 발급에 실패했습니다.",
        error?.message,
      );
    }
    return {
      uploadUrl: data.signedUrl,
      path: storagePath,
      bucket,
      expiresIn: MEMBER_GYM_UPLOAD_EXPIRES_SEC,
    };
  },
};
