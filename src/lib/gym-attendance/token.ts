import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** 출석 키오스크 공개 토큰 — 추측 불가 entropy (48 hex = 24 bytes) */
const TOKEN_BYTES = 24;

export function generateGymAttendanceKioskToken(): string {
  return randomBytes(TOKEN_BYTES).toString("hex");
}

export function hashGymAttendanceKioskToken(token: string): string {
  return createHash("sha256").update(token.trim(), "utf8").digest("hex");
}

export function gymAttendanceKioskTokensEqual(
  plainToken: string,
  tokenHash: string,
): boolean {
  const hashed = Buffer.from(hashGymAttendanceKioskToken(plainToken), "utf8");
  const expected = Buffer.from(tokenHash, "utf8");
  if (hashed.length !== expected.length) return false;
  return timingSafeEqual(hashed, expected);
}

export function buildGymAttendanceKioskUrl(token: string, origin?: string): string {
  const path = `/gym-attendance/${token.trim()}`;
  if (!origin) return path;
  return `${origin.replace(/\/$/, "")}${path}`;
}

/** 로그·audit용 — raw phone 금지, 끝 4자리만 */
export function maskPhoneTail(normalizedPhone: string): string {
  const d = normalizedPhone.replace(/\D/g, "");
  if (d.length < 4) return "****";
  return `****${d.slice(-4)}`;
}

/** rate-limit 키용 phone hash (raw 저장 금지) */
export function hashAttendancePhoneKey(normalizedPhone: string): string {
  return createHash("sha256")
    .update(`gym-attendance-phone:${normalizedPhone}`, "utf8")
    .digest("hex")
    .slice(0, 32);
}
