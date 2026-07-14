import "server-only";

import { randomUUID } from "node:crypto";
import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import {
  AssociationJoinLinkAttachmentKind,
  AssociationMemberGymApplicationAttachmentType,
} from "@/lib/enums";
import {
  MEMBER_GYM_ALLOWED_DOCUMENT_MIME,
  MEMBER_GYM_ALLOWED_IMAGE_MIME,
  MEMBER_GYM_DOCUMENT_MAX_BYTES,
  MEMBER_GYM_DOWNLOAD_EXPIRES_SEC,
  MEMBER_GYM_IMAGE_MAX_BYTES,
  MEMBER_GYM_UPLOAD_EXPIRES_SEC,
  memberGymFilesBucket,
} from "@/lib/member-gym/constants";
import { resolveAssociationOrganizerScope } from "@/lib/permissions";
import { memberGymRepository } from "@/lib/repositories/member-gym.repository";
import {
  evaluateMemberGymJoinGate,
  resolveJoinLinkFromPublicToken,
} from "@/lib/services/member-gym.service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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

async function createSignedUpload(path: string) {
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
}

async function createSignedDownload(bucket: string, path: string) {
  if (!path.startsWith("member-gym/")) {
    throw new AppError("FORBIDDEN", "잘못된 파일 경로입니다.");
  }
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, MEMBER_GYM_DOWNLOAD_EXPIRES_SEC);
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
}

export const memberGymUploadService = {
  async issueApplicationUploadUrl(input: {
    token: string;
    uploadBatchId: string;
    attachmentType: AssociationMemberGymApplicationAttachmentType;
    mimeType: string;
    sizeBytes: number;
    originalFileName: string;
  }) {
    assertMimeAndSize(input.mimeType, input.sizeBytes);
    const link = await resolveJoinLinkFromPublicToken(input.token);
    const gate = evaluateMemberGymJoinGate(link);
    if (!gate.ok) {
      throw new AppError("FORBIDDEN", "유효하지 않은 가입 링크입니다.");
    }
    const batch = input.uploadBatchId.trim();
    if (!batch || batch.length < 8) {
      throw new AppError("VALIDATION_ERROR", "uploadBatchId가 필요합니다.");
    }
    const ext = extFromMime(input.mimeType);
    const path = `member-gym/applications/pending/${batch}/${randomUUID()}.${ext}`;
    return createSignedUpload(path);
  },

  async issueManualApplicationUploadUrl(
    actor: ActorContext,
    input: {
      uploadBatchId: string;
      attachmentType: AssociationMemberGymApplicationAttachmentType;
      mimeType: string;
      sizeBytes: number;
      originalFileName: string;
    },
    organizerIdHint?: string | null,
  ) {
    assertMimeAndSize(input.mimeType, input.sizeBytes);
    const organizerId = resolveAssociationOrganizerScope(actor, organizerIdHint);
    const batch = input.uploadBatchId.trim();
    if (!batch || batch.length < 8) {
      throw new AppError("VALIDATION_ERROR", "uploadBatchId가 필요합니다.");
    }
    const ext = extFromMime(input.mimeType);
    const path = `member-gym/applications/manual/${organizerId}/${batch}/${randomUUID()}.${ext}`;
    return createSignedUpload(path);
  },

  async issueLinkAttachmentUploadUrl(
    actor: ActorContext,
    input: {
      linkId: string;
      mimeType: string;
      sizeBytes: number;
      kind?: AssociationJoinLinkAttachmentKind;
    },
    organizerIdHint?: string | null,
  ) {
    assertMimeAndSize(input.mimeType, input.sizeBytes);
    const organizerId = resolveAssociationOrganizerScope(actor, organizerIdHint);
    const link = await memberGymRepository.findJoinLinkById(
      organizerId,
      input.linkId,
    );
    if (!link) throw new AppError("NOT_FOUND", "가입 링크를 찾을 수 없습니다.");
    const ext = extFromMime(input.mimeType);
    const path = `member-gym/join-links/${organizerId}/${link.id}/${randomUUID()}.${ext}`;
    return createSignedUpload(path);
  },

  async registerLinkAttachment(
    actor: ActorContext,
    input: {
      linkId: string;
      storagePath: string;
      originalFileName: string;
      mimeType: string;
      sizeBytes: number;
      kind?: AssociationJoinLinkAttachmentKind;
    },
    organizerIdHint?: string | null,
  ) {
    const organizerId = resolveAssociationOrganizerScope(actor, organizerIdHint);
    const link = await memberGymRepository.findJoinLinkById(
      organizerId,
      input.linkId,
    );
    if (!link) throw new AppError("NOT_FOUND", "가입 링크를 찾을 수 없습니다.");
    if (
      !input.storagePath.startsWith(
        `member-gym/join-links/${organizerId}/${link.id}/`,
      )
    ) {
      throw new AppError("FORBIDDEN", "파일 경로가 올바르지 않습니다.");
    }
    assertMimeAndSize(input.mimeType, input.sizeBytes);
    return memberGymRepository.createJoinLinkAttachment({
      joinLink: { connect: { id: link.id } },
      kind: input.kind ?? AssociationJoinLinkAttachmentKind.other,
      storageBucket: memberGymFilesBucket(),
      storagePath: input.storagePath,
      originalFileName: input.originalFileName.slice(0, 200),
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      uploadedByUser: { connect: { id: actor.userId } },
    });
  },

  async getApplicationAttachmentDownloadUrl(
    actor: ActorContext,
    attachmentId: string,
    organizerIdHint?: string | null,
  ) {
    const organizerId = resolveAssociationOrganizerScope(actor, organizerIdHint);
    const row = await memberGymRepository.findApplicationAttachment(
      organizerId,
      attachmentId,
    );
    if (!row) throw new AppError("NOT_FOUND", "첨부파일을 찾을 수 없습니다.");
    return createSignedDownload(row.storageBucket, row.storagePath);
  },

  async getLinkAttachmentDownloadForOrganizer(
    actor: ActorContext,
    attachmentId: string,
    organizerIdHint?: string | null,
  ) {
    const organizerId = resolveAssociationOrganizerScope(actor, organizerIdHint);
    const row = await memberGymRepository.findJoinLinkAttachmentById(attachmentId);
    if (!row || row.joinLink.organizerId !== organizerId) {
      throw new AppError("NOT_FOUND", "안내자료를 찾을 수 없습니다.");
    }
    return createSignedDownload(row.storageBucket, row.storagePath);
  },

  async getLinkAttachmentDownloadByToken(token: string, attachmentId: string) {
    const link = await resolveJoinLinkFromPublicToken(token);
    const gate = evaluateMemberGymJoinGate(link);
    if (!gate.ok) {
      throw new AppError("FORBIDDEN", "유효하지 않은 가입 링크입니다.");
    }
    const row = await memberGymRepository.findJoinLinkAttachmentById(attachmentId);
    if (!row || row.joinLinkId !== gate.link.id) {
      throw new AppError("NOT_FOUND", "안내자료를 찾을 수 없습니다.");
    }
    return createSignedDownload(row.storageBucket, row.storagePath);
  },
};
