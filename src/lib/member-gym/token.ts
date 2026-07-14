import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { parseStableMemberGymJoinToken } from "@/lib/member-gym/join-link-url";

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

/** 공개 URL 토큰이 안정(HMAC) 형식인지 / 레거시 랜덤인지 판별용 */
export function isStableMemberGymJoinToken(token: string): boolean {
  return parseStableMemberGymJoinToken(token) != null;
}
