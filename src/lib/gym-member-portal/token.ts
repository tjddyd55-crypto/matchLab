import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** 회원 포털 공용 진입 식별자 — 32 bytes entropy, base64url (URL-safe) */
const TOKEN_BYTES = 32;

export function generateGymMemberPortalToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export function hashGymMemberPortalToken(token: string): string {
  return createHash("sha256").update(token.trim(), "utf8").digest("hex");
}

export function gymMemberPortalTokensEqual(
  plainToken: string,
  tokenHash: string,
): boolean {
  const hashed = Buffer.from(hashGymMemberPortalToken(plainToken), "utf8");
  const expected = Buffer.from(tokenHash, "utf8");
  if (hashed.length !== expected.length) return false;
  return timingSafeEqual(hashed, expected);
}

export function buildGymMemberPortalUrl(token: string, origin?: string): string {
  const path = `/member-portal/${token.trim()}`;
  if (!origin) return path;
  return `${origin.replace(/\/$/, "")}${path}`;
}

export function hashPortalPhoneKey(normalizedPhone: string): string {
  return createHash("sha256")
    .update(`gym-member-portal-phone:${normalizedPhone}`, "utf8")
    .digest("hex")
    .slice(0, 32);
}

export function maskPortalPhoneDisplay(normalizedPhone: string): string {
  const d = normalizedPhone.replace(/\D/g, "");
  if (d.length < 4) return "****";
  if (d.length <= 7) return `${d.slice(0, 3)}-****`;
  return `${d.slice(0, 3)}-****-${d.slice(-4)}`;
}
