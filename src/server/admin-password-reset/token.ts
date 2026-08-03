import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { getAppBaseUrl } from "@/lib/app-url";

export function generateAdminPasswordResetToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashAdminPasswordResetToken(token: string): string {
  return createHash("sha256").update(token.trim(), "utf8").digest("hex");
}

export function adminPasswordResetTokensEqual(
  plain: string,
  hash: string,
): boolean {
  const a = Buffer.from(hashAdminPasswordResetToken(plain), "utf8");
  const b = Buffer.from(hash, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function hashAdminPasswordResetIp(ip: string | null | undefined): string | null {
  const v = (ip ?? "").trim();
  if (!v) return null;
  return createHash("sha256").update(`apr-ip|${v}`, "utf8").digest("hex");
}

export function hashAdminPasswordResetUserAgent(
  ua: string | null | undefined,
): string | null {
  const v = (ua ?? "").trim();
  if (!v) return null;
  return createHash("sha256").update(`apr-ua|${v}`, "utf8").digest("hex");
}

/** 서버 APP_URL SSOT — request host를 신뢰하지 않는다. */
export function buildAdminPasswordResetLinkUrl(rawToken: string): string {
  const base = getAppBaseUrl().replace(/\/$/, "");
  return `${base}/password-reset/admin-link?token=${encodeURIComponent(rawToken)}`;
}

export const ADMIN_PASSWORD_RESET_CHALLENGE_COOKIE =
  "matchon_apr_challenge";
