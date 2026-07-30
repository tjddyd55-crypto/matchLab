/**
 * 회원 프로필 사진 — private storage 전용 서비스.
 *
 * 계약 (`gym-member-image-upload.ts`):
 * - 버킷은 private. DB에는 객체 경로(path)만 저장하고 화면에는 signed read URL을 내려준다.
 * - 경로는 서버에서만 만든다 (외부 입력을 경로에 그대로 쓰지 않는다).
 * - 경로 접두사(`gyms/{gymId}/members/`)가 체육관 간 격리의 유일한 기준이다.
 */
import "server-only";

import { randomUUID } from "crypto";
import type { ActorContext } from "@/lib/auth/actor-context";
import {
  GYM_MEMBER_IMAGE_ALLOWED_MIME,
  GYM_MEMBER_IMAGE_MAX_BYTES,
  GYM_MEMBER_IMAGE_READ_EXPIRES_SEC,
  GYM_MEMBER_IMAGE_UPLOAD_EXPIRES_SEC,
  assertGymMemberImagePath,
  gymMemberImagesBucket,
  isGymMemberImagePathOwned,
} from "@/lib/constants/gym-member-image-upload";
import { AppError } from "@/lib/errors/app-error";
import {
  requireGymPortalRead,
  requireGymPortalWrite,
} from "@/lib/gym-portal-access";
import { gymMemberRepository } from "@/lib/repositories/gym-member.repository";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const ALLOWED_MIME = new Set<string>(GYM_MEMBER_IMAGE_ALLOWED_MIME);

/** 회원 식별자가 아직 없는 등록 폼 단계의 경로 세그먼트. */
const PENDING_MEMBER_SEGMENT = "_pending";

export type GymMemberImageUploadTicket = {
  uploadUrl: string;
  path: string;
  expiresIn: number;
  maxBytes: number;
};

function extensionForMime(mimeType: string): "jpg" | "png" | "webp" {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/jpeg") return "jpg";
  throw new AppError(
    "VALIDATION_ERROR",
    "JPG, PNG, WebP 이미지만 업로드할 수 있습니다.",
  );
}

/** 형식: gyms/{gymId}/members/{memberId|_pending}/{uuid}.{ext} */
export function buildGymMemberImagePath(input: {
  gymId: string;
  memberId?: string | null;
  mimeType: string;
}): string {
  const ext = extensionForMime(input.mimeType.trim());
  const scope = input.memberId?.trim() || PENDING_MEMBER_SEGMENT;
  return `gyms/${input.gymId}/members/${scope}/${randomUUID()}.${ext}`;
}

function assertAllowedMime(mimeType: string): string {
  const mime = mimeType.trim();
  if (!ALLOWED_MIME.has(mime)) {
    throw new AppError(
      "VALIDATION_ERROR",
      "JPG, PNG, WebP 이미지만 업로드할 수 있습니다.",
    );
  }
  return mime;
}

async function assertMemberInGym(memberId: string, gymId: string) {
  const member = await gymMemberRepository.findImageContextForGym(
    memberId,
    gymId,
  );
  if (!member) {
    throw new AppError("NOT_FOUND", "회원을 찾을 수 없습니다.");
  }
  return member;
}

/**
 * 회원 사진 업로드용 signed URL 발급 (관장 쓰기 권한).
 * `memberId`가 없으면 등록 폼 단계로 보고 체육관 범위 경로만 발급한다.
 */
export async function createGymMemberImageUploadUrl(
  actor: ActorContext,
  input: { memberId?: string | null; mimeType: string },
): Promise<GymMemberImageUploadTicket> {
  const access = await requireGymPortalWrite(actor);
  const mimeType = assertAllowedMime(input.mimeType);

  if (input.memberId?.trim()) {
    await assertMemberInGym(input.memberId.trim(), access.gymId);
  }

  const path = buildGymMemberImagePath({
    gymId: access.gymId,
    memberId: input.memberId,
    mimeType,
  });

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(gymMemberImagesBucket())
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
    expiresIn: GYM_MEMBER_IMAGE_UPLOAD_EXPIRES_SEC,
    maxBytes: GYM_MEMBER_IMAGE_MAX_BYTES,
  };
}

/**
 * 이미 검증된 체육관 범위에서 signed read URL 생성 (서버 내부용).
 * 경로가 해당 체육관 소유가 아니면 즉시 실패한다.
 */
export async function createGymMemberImageSignedReadUrlForPath(
  gymId: string,
  path: string,
): Promise<string | null> {
  const trimmed = path.trim();
  if (!trimmed) return null;
  if (!isGymMemberImagePathOwned(trimmed, gymId)) {
    throw new AppError(
      "FORBIDDEN",
      "다른 체육관 사진에는 접근할 수 없습니다.",
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(gymMemberImagesBucket())
    .createSignedUrl(trimmed, GYM_MEMBER_IMAGE_READ_EXPIRES_SEC);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/**
 * 목록 화면용 일괄 서명. 실패한 경로는 결과에서 제외한다 (렌더는 이니셜 fallback).
 */
export async function createGymMemberImageSignedReadUrlMap(
  gymId: string,
  paths: readonly (string | null | undefined)[],
): Promise<Map<string, string>> {
  const unique = Array.from(
    new Set(paths.filter((p): p is string => Boolean(p?.trim()))),
  );
  if (unique.length === 0) return new Map();

  const signed = await Promise.all(
    unique.map(async (path) => {
      try {
        return [path, await createGymMemberImageSignedReadUrlForPath(gymId, path)] as const;
      } catch {
        return [path, null] as const;
      }
    }),
  );

  const map = new Map<string, string>();
  for (const [path, url] of signed) {
    if (url) map.set(path, url);
  }
  return map;
}

/** 체육관 포털 사용자용 signed read URL (actor.gymId 범위). */
export async function createGymMemberImageSignedReadUrl(
  actor: ActorContext,
  path: string,
): Promise<{ signedUrl: string; expiresIn: number }> {
  const access = await requireGymPortalRead(actor);
  const signedUrl = await createGymMemberImageSignedReadUrlForPath(
    access.gymId,
    path,
  );
  if (!signedUrl) {
    throw new AppError("NOT_FOUND", "사진을 찾을 수 없습니다.");
  }
  return { signedUrl, expiresIn: GYM_MEMBER_IMAGE_READ_EXPIRES_SEC };
}

/**
 * 사진 교체·제거 시 이전 객체 정리 (best-effort).
 * 스토리지 실패가 회원 정보 저장을 막지 않도록 예외를 삼킨다.
 */
export async function removeGymMemberImageObject(
  path: string | null | undefined,
): Promise<void> {
  const trimmed = path?.trim();
  if (!trimmed) return;
  try {
    const supabase = createSupabaseAdminClient();
    await supabase.storage.from(gymMemberImagesBucket()).remove([trimmed]);
  } catch {
    // 무시 — 고아 객체는 별도 정리 잡의 책임
  }
}
