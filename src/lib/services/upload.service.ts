/**
 * Private Storage 업로드·조회용 signed URL (`api-contract.md` §10).
 * 기본적으로 공개 URL은 반환하지 않으며, 예외적으로 대회 공개 이미지 전용 버킷 헬퍼를 별도 분리한다.
 */
import "server-only";

import { randomUUID } from "crypto";
import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import { requireGymOwner, requireOrganizerForEvent, requireRole } from "@/lib/permissions";
import { consentRepository } from "@/lib/repositories/consent.repository";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/** MVP: 업로드 signed URL 만료(초). api-contract §10.5 권장 범위 내. */
export const CONSENT_SIGNATURE_UPLOAD_EXPIRES_SEC = 300;

/** MVP: private 객체 조회 signed URL 만료(초). */
export const PRIVATE_FILE_DOWNLOAD_EXPIRES_SEC = 180;

/**
 * 클라이언트·서버 계약: 동의 서명 이미지 최대 크기(바이트) — 클라이언트에서 선제 검증 권장.
 * 서명된 업로드 요청 자체의 크기 제한은 Storage 정책·운영 설정과 함께 조정.
 */
export const CONSENT_SIGNATURE_MAX_BYTES = 2 * 1024 * 1024;

const ALLOWED_CONSENT_SIGNATURE_MIME = new Set(["image/png", "image/webp"]);

export type ConsentSignaturePathInput = {
  registrationSubmissionId: string;
  consentId: string;
  mimeType: string;
};

export type ConsentSignatureUploadPublicContext = {
  kind: "invite_token";
  token: string;
};

export type ConsentSignatureUploadActorContext =
  | ConsentSignatureUploadPublicContext
  | { kind: "gym_actor"; actor: ActorContext };

function consentSignaturesBucket(): string {
  return (
    process.env.SUPABASE_CONSENT_SIGNATURE_BUCKET?.trim() ||
    "consent-signatures"
  );
}

function extensionForMime(mimeType: string): "png" | "webp" {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  throw new AppError(
    "VALIDATION_ERROR",
    "허용되지 않는 이미지 형식입니다. PNG 또는 WebP만 가능합니다.",
  );
}

/**
 * 서버에서만 생성하는 객체 경로 (외부 입력을 경로에 그대로 쓰지 않음).
 * 형식: consents/{registrationSubmissionId}/{consentId}/{uuid}.(png|webp)
 */
export function buildConsentSignaturePath(
  input: ConsentSignaturePathInput,
): string {
  const ext = extensionForMime(input.mimeType.trim());
  const id = randomUUID();
  return `consents/${input.registrationSubmissionId}/${input.consentId}/${id}.${ext}`;
}

/**
 * 동의 서명 업로드용 signed URL 발급.
 * — `invite_token`: 등록 초대 토큰 + 제출·동의 연결 검증 (만료·maxUses 등은 등록 제출 시점에만 게이트).
 */
export async function createConsentSignatureUploadUrl(
  actorOrTokenContext: ConsentSignatureUploadActorContext,
  input: ConsentSignaturePathInput,
): Promise<{ uploadUrl: string; path: string; expiresIn: number }> {
  const mimeType = input.mimeType.trim();
  if (!ALLOWED_CONSENT_SIGNATURE_MIME.has(mimeType)) {
    throw new AppError(
      "VALIDATION_ERROR",
      "허용되지 않는 이미지 형식입니다.",
    );
  }

  if (actorOrTokenContext.kind === "invite_token") {
    await consentRepository.assertConsentInviteUploadAllowed({
      token: actorOrTokenContext.token,
      registrationSubmissionId: input.registrationSubmissionId,
      consentId: input.consentId,
    });
  } else {
    requireRole(actorOrTokenContext.actor, ["gym", "admin"]);
    const ctx = await consentRepository.findConsentAccessContext(input.consentId);
    if (!ctx?.registrationSubmissionId) {
      throw new AppError("NOT_FOUND", "동의 정보를 찾을 수 없습니다.");
    }
    await requireGymOwner(actorOrTokenContext.actor, ctx.gymId);
    if (ctx.registrationSubmissionId !== input.registrationSubmissionId) {
      throw new AppError("FORBIDDEN", "등록 요청과 동의서가 일치하지 않습니다.");
    }
  }

  const path = buildConsentSignaturePath(input);

  const supabase = createSupabaseAdminClient();
  const bucket = consentSignaturesBucket();

  const { data, error } = await supabase.storage
    .from(bucket)
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
    expiresIn: CONSENT_SIGNATURE_UPLOAD_EXPIRES_SEC,
  };
}

/**
 * 저장된 private 객체에 대한 단기 download signed URL (체육관·관리자 등 서버 검증 후).
 */
export async function getPrivateFileSignedUrl(
  actor: ActorContext,
  input: { bucket: string; path: string },
): Promise<{ signedUrl: string; expiresIn: number }> {
  requireRole(actor, ["gym", "admin"]);
  const consentCtx = await consentRepository.findConsentAccessContextByPath(
    input.path,
  );
  if (!consentCtx) {
    throw new AppError("NOT_FOUND", "파일을 찾을 수 없습니다.");
  }
  await requireGymOwner(actor, consentCtx.gymId);

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(input.bucket)
    .createSignedUrl(input.path, PRIVATE_FILE_DOWNLOAD_EXPIRES_SEC);

  if (error || !data?.signedUrl) {
    throw new AppError(
      "INTERNAL",
      "파일 URL 발급에 실패했습니다.",
      error?.message,
    );
  }

  return {
    signedUrl: data.signedUrl,
    expiresIn: PRIVATE_FILE_DOWNLOAD_EXPIRES_SEC,
  };
}

/** MVP: 대회 공개 이미지 업로드 signed URL 만료(초). */
export const EVENT_IMAGE_UPLOAD_EXPIRES_SEC = 300;

/**
 * 대회 포스터·갤러리(공개 페이지 노출) 최대 바이트 — 클라이언트에서 선제 검증 권장.
 */
export const EVENT_IMAGE_MAX_BYTES = 8 * 1024 * 1024;

const ALLOWED_EVENT_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function eventImagesBucket(): string {
  return (
    process.env.SUPABASE_EVENT_IMAGE_BUCKET?.trim() || "event-images"
  );
}

function extensionForEventImageMime(mimeType: string): "jpg" | "png" | "webp" {
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
 * 공개 읽기 버킷(`SUPABASE_EVENT_IMAGE_BUCKET`) 객체 URL.
 * 장기적으로 Cloudflare R2 등으로 옮길 수 있음 — TODO.
 */
export function buildPublicStorageUrlForEventImages(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
  if (!base) {
    throw new AppError(
      "INTERNAL",
      "NEXT_PUBLIC_SUPABASE_URL 이 필요합니다. 공개 이미지 URL을 만들 수 없습니다.",
    );
  }
  const bucket = eventImagesBucket();
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}

export function buildEventPosterStoragePath(
  eventId: string,
  mimeType: string,
): string {
  const ext = extensionForEventImageMime(mimeType);
  return `events/${eventId}/poster/${randomUUID()}.${ext}`;
}

export function buildEventGalleryStoragePath(
  eventId: string,
  mimeType: string,
): string {
  const ext = extensionForEventImageMime(mimeType);
  return `events/${eventId}/gallery/${randomUUID()}.${ext}`;
}

/**
 * 대회 이미지 업로드용 signed URL (공개 버킷).
 * consent-signatures 버킷과 경로·정책을 섞지 않는다.
 */
export async function createEventImageSignedUploadUrl(
  actor: ActorContext,
  input: {
    eventId: string;
    mimeType: string;
    kind: "poster" | "gallery";
  },
): Promise<{ uploadUrl: string; path: string; publicUrl: string }> {
  await requireOrganizerForEvent(actor, input.eventId);
  const mimeType = input.mimeType.trim();
  if (!ALLOWED_EVENT_IMAGE_MIME.has(mimeType)) {
    throw new AppError(
      "VALIDATION_ERROR",
      "허용되지 않는 이미지 형식입니다.",
    );
  }

  const path =
    input.kind === "poster"
      ? buildEventPosterStoragePath(input.eventId, mimeType)
      : buildEventGalleryStoragePath(input.eventId, mimeType);

  const supabase = createSupabaseAdminClient();
  const bucket = eventImagesBucket();

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUploadUrl(path, { upsert: true });

  if (error || !data?.signedUrl) {
    throw new AppError(
      "INTERNAL",
      "업로드 URL 발급에 실패했습니다.",
      error?.message,
    );
  }

  const publicUrl = buildPublicStorageUrlForEventImages(path);

  return {
    uploadUrl: data.signedUrl,
    path,
    publicUrl,
  };
}
