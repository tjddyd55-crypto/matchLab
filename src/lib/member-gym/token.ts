import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** 가입 링크 원문 토큰 길이(hex chars) — GymInvite는 48, 본 기능도 동일 entropy. */
const TOKEN_BYTES = 24;

export function generateMemberGymJoinToken(): string {
  return randomBytes(TOKEN_BYTES).toString("hex");
}

export function hashMemberGymJoinToken(token: string): string {
  return createHash("sha256").update(token.trim(), "utf8").digest("hex");
}

export function memberGymJoinTokensEqual(
  plainToken: string,
  tokenHash: string,
): boolean {
  const hashed = Buffer.from(hashMemberGymJoinToken(plainToken), "utf8");
  const expected = Buffer.from(tokenHash, "utf8");
  if (hashed.length !== expected.length) return false;
  return timingSafeEqual(hashed, expected);
}
