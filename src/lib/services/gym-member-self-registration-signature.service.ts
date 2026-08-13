import "server-only";

import { randomUUID } from "node:crypto";
import { AppError } from "@/lib/errors/app-error";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  PRIVATE_FILE_DOWNLOAD_EXPIRES_SEC,
  uploadPrivateObjectBytes,
} from "@/lib/services/upload.service";
import { SELF_REGISTRATION_SIGNATURE_MAX_BYTES } from "@/lib/gym-member-self-registration/constants";

function signatureBucket(): string {
  return (
    process.env.SUPABASE_CONSENT_SIGNATURE_BUCKET?.trim() ||
    "consent-signatures"
  );
}

export function buildSelfRegistrationSignaturePath(input: {
  gymId: string;
  requestId: string;
  kind: "member" | "guardian";
}): string {
  return `gym-self-reg/${input.gymId}/${input.requestId}/${input.kind}-${randomUUID()}.png`;
}

export async function storeSelfRegistrationSignaturePng(input: {
  gymId: string;
  requestId: string;
  kind: "member" | "guardian";
  bytes: Uint8Array;
}): Promise<string> {
  if (input.bytes.byteLength === 0) {
    throw new AppError("VALIDATION_ERROR", "서명이 비어 있습니다.");
  }
  if (input.bytes.byteLength > SELF_REGISTRATION_SIGNATURE_MAX_BYTES) {
    throw new AppError("VALIDATION_ERROR", "서명 이미지가 너무 큽니다.");
  }
  const path = buildSelfRegistrationSignaturePath(input);
  await uploadPrivateObjectBytes(
    signatureBucket(),
    path,
    input.bytes,
    "image/png",
  );
  return path;
}

export async function createSelfRegistrationSignatureReadUrl(
  path: string,
): Promise<string | null> {
  const trimmed = path.trim();
  if (!trimmed) return null;
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(signatureBucket())
    .createSignedUrl(trimmed, PRIVATE_FILE_DOWNLOAD_EXPIRES_SEC);
  if (error || !data?.signedUrl) {
    throw new AppError(
      "INTERNAL",
      "서명 이미지를 불러올 수 없습니다.",
      error?.message,
    );
  }
  return data.signedUrl;
}
