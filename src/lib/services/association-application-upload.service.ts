import "server-only";

import { randomUUID } from "node:crypto";
import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import { AssociationApplicationAttachmentType, UserRole } from "@/lib/enums";
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
import { requireRole } from "@/lib/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const PATH_PREFIX = "association-applications/";

export function associationAttachmentMaxBytes(
  attachmentType: AssociationApplicationAttachmentType,
  mimeType: string,
): number {
  if (attachmentType === AssociationApplicationAttachmentType.logo) {
    return MEMBER_GYM_IMAGE_MAX_BYTES;
  }
  return MEMBER_GYM_ALLOWED_IMAGE_MIME.has(mimeType)
    ? MEMBER_GYM_IMAGE_MAX_BYTES
    : MEMBER_GYM_DOCUMENT_MAX_BYTES;
}

export function assertAssociationAttachmentMimeAndSize({
  attachmentType,
  mimeType,
  sizeBytes,
}: {
  attachmentType: AssociationApplicationAttachmentType;
  mimeType: string;
  sizeBytes: number;
}) {
  const allowedMimeTypes =
    attachmentType === AssociationApplicationAttachmentType.logo
      ? MEMBER_GYM_ALLOWED_IMAGE_MIME
      : MEMBER_GYM_ALLOWED_DOCUMENT_MIME;
  if (!allowedMimeTypes.has(mimeType)) {
    throw new AppError(
      "VALIDATION_ERROR",
      attachmentType === AssociationApplicationAttachmentType.logo
        ? "지원하지 않는 파일 형식입니다. JPEG, PNG, WebP 파일을 선택해 주세요."
        : "지원하지 않는 파일 형식입니다. JPEG, PNG, WebP, PDF 파일을 선택해 주세요.",
    );
  }
  const max = associationAttachmentMaxBytes(attachmentType, mimeType);
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

function assertAssociationApplicationPath(path: string) {
  if (!path.startsWith(PATH_PREFIX)) {
    throw new AppError("FORBIDDEN", "잘못된 파일 경로입니다.");
  }
}

export const associationApplicationUploadService = {
  async issueUploadUrl(input: {
    uploadBatchId: string;
    attachmentType: AssociationApplicationAttachmentType;
    mimeType: string;
    sizeBytes: number;
    originalFileName: string;
  }) {
    if (
      !Object.values(AssociationApplicationAttachmentType).includes(
        input.attachmentType,
      )
    ) {
      throw new AppError("VALIDATION_ERROR", "첨부 유형이 올바르지 않습니다.");
    }
    assertAssociationAttachmentMimeAndSize(input);
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
    const row = await prisma.associationApplicationAttachment.findFirst({
      where: { id: attachmentId, deletedAt: null },
      select: {
        storageBucket: true,
        storagePath: true,
        application: { select: { deletedAt: true } },
      },
    });
    if (!row || row.application.deletedAt) {
      throw new AppError("NOT_FOUND", "첨부파일을 찾을 수 없습니다.");
    }
    assertAssociationApplicationPath(row.storagePath);
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.storage
      .from(row.storageBucket)
      .createSignedUrl(row.storagePath, MEMBER_GYM_DOWNLOAD_EXPIRES_SEC);
    if (error || !data?.signedUrl) {
      throw new AppError(
        "INTERNAL",
        "다운로드 URL 발급에 실패했습니다.",
        error?.message,
      );
    }
    return {
      signedUrl: data.signedUrl,
      expiresIn: MEMBER_GYM_DOWNLOAD_EXPIRES_SEC,
    };
  },
};
