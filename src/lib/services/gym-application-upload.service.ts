import "server-only";

import { randomUUID } from "node:crypto";
import { AppError } from "@/lib/errors/app-error";
import { GymApplicationAttachmentType } from "@/lib/enums";
import { GYM_JOIN_IMAGE_ONLY_ATTACHMENT_TYPES } from "@/lib/gym-join/application-form";
import {
  MEMBER_GYM_ALLOWED_DOCUMENT_MIME,
  MEMBER_GYM_ALLOWED_IMAGE_MIME,
  MEMBER_GYM_DOCUMENT_MAX_BYTES,
  MEMBER_GYM_DOWNLOAD_EXPIRES_SEC,
  MEMBER_GYM_IMAGE_MAX_BYTES,
  MEMBER_GYM_UPLOAD_EXPIRES_SEC,
  memberGymFilesBucket,
} from "@/lib/member-gym/constants";
import { prisma } from "@/lib/prisma";
import type { ActorContext } from "@/lib/auth/actor-context";
import { requireRole } from "@/lib/permissions";
import { UserRole } from "@/lib/enums";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const PATH_PREFIX = "gym-applications/";

export function assertGymApplicationAttachmentMimeAndSize({
  attachmentType,
  mimeType,
  sizeBytes,
}: {
  attachmentType: GymApplicationAttachmentType;
  mimeType: string;
  sizeBytes: number;
}) {
  const imageOnly = GYM_JOIN_IMAGE_ONLY_ATTACHMENT_TYPES.has(attachmentType);
  const allowed = imageOnly
    ? MEMBER_GYM_ALLOWED_IMAGE_MIME
    : MEMBER_GYM_ALLOWED_DOCUMENT_MIME;
  if (!allowed.has(mimeType)) {
    throw new AppError(
      "VALIDATION_ERROR",
      imageOnly
        ? "지원하지 않는 파일 형식입니다. JPEG, PNG, WebP 파일을 선택해 주세요."
        : "지원하지 않는 파일 형식입니다. JPEG, PNG, WebP, PDF 파일을 선택해 주세요.",
    );
  }
  const max = MEMBER_GYM_ALLOWED_IMAGE_MIME.has(mimeType)
    ? MEMBER_GYM_IMAGE_MAX_BYTES
    : MEMBER_GYM_DOCUMENT_MAX_BYTES;
  if (sizeBytes > max) {
    throw new AppError(
      "VALIDATION_ERROR",
      `파일 용량이 너무 큽니다. 최대 ${Math.floor(max / (1024 * 1024))}MB 이하의 파일을 선택해 주세요.`,
    );
  }
}

function extFromMime(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "application/pdf":
      return "pdf";
    default:
      return "bin";
  }
}

export const gymApplicationUploadService = {
  async issueUploadUrl(input: {
    uploadBatchId: string;
    attachmentType: GymApplicationAttachmentType;
    mimeType: string;
    sizeBytes: number;
    originalFileName: string;
  }) {
    if (
      !Object.values(GymApplicationAttachmentType).includes(input.attachmentType)
    ) {
      throw new AppError("VALIDATION_ERROR", "첨부 유형이 올바르지 않습니다.");
    }
    assertGymApplicationAttachmentMimeAndSize(input);
    const batch = input.uploadBatchId.trim();
    if (!batch || batch.length < 8) {
      throw new AppError("VALIDATION_ERROR", "uploadBatchId가 필요합니다.");
    }
    const ext = extFromMime(input.mimeType);
    const path = `${PATH_PREFIX}pending/${batch}/${randomUUID()}.${ext}`;
    const supabase = createSupabaseAdminClient();
    const bucket = memberGymFilesBucket();
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(path, { upsert: false });
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
      bucket,
      expiresIn: MEMBER_GYM_UPLOAD_EXPIRES_SEC,
    };
  },

  async getAttachmentDownloadUrl(actor: ActorContext, attachmentId: string) {
    requireRole(actor, [UserRole.admin]);
    const row = await prisma.gymApplicationAttachment.findFirst({
      where: { id: attachmentId, deletedAt: null },
    });
    if (!row) throw new AppError("NOT_FOUND", "첨부 파일을 찾을 수 없습니다.");
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.storage
      .from(row.storageBucket)
      .createSignedUrl(row.storagePath, MEMBER_GYM_DOWNLOAD_EXPIRES_SEC);
    if (error || !data?.signedUrl) {
      throw new AppError("INTERNAL", "다운로드 URL 발급에 실패했습니다.");
    }
    return {
      downloadUrl: data.signedUrl,
      originalFileName: row.originalFileName,
      mimeType: row.mimeType,
    };
  },
};
