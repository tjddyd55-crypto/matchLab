import "server-only";

import { randomUUID } from "node:crypto";
import { AppError } from "@/lib/errors/app-error";
import { uploadPrivateObjectBytes } from "@/lib/services/upload.service";
import { SELF_REGISTRATION_SIGNATURE_MAX_BYTES } from "@/lib/gym-member-self-registration/constants";

function signatureBucket(): string {
  return (
    process.env.SUPABASE_CONSENT_SIGNATURE_BUCKET?.trim() ||
    "consent-signatures"
  );
}

export function buildAdditionalInfoSignaturePath(input: {
  eventId: string;
  applicationId: string;
}): string {
  return `additional-info/${input.eventId}/${input.applicationId}/${randomUUID()}.png`;
}

/** 2차 추가정보 손서명 — private object key만 반환 (공개 URL 금지). */
export async function storeAdditionalInfoSignaturePng(input: {
  eventId: string;
  applicationId: string;
  bytes: Uint8Array;
}): Promise<string> {
  if (input.bytes.byteLength === 0) {
    throw new AppError("VALIDATION_ERROR", "서명이 비어 있습니다.");
  }
  if (input.bytes.byteLength > SELF_REGISTRATION_SIGNATURE_MAX_BYTES) {
    throw new AppError("VALIDATION_ERROR", "서명 이미지가 너무 큽니다.");
  }
  const path = buildAdditionalInfoSignaturePath(input);
  await uploadPrivateObjectBytes(
    signatureBucket(),
    path,
    input.bytes,
    "image/png",
  );
  return path;
}
