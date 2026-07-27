import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const FIGHTER_ACCOUNT_SETUP_TTL_MS = 24 * 60 * 60 * 1000;
export const FIGHTER_PASSWORD_RESET_TTL_MS = 2 * 60 * 60 * 1000;

export function generateFighterAccountToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashFighterAccountToken(token: string): string {
  return createHash("sha256").update(token.trim(), "utf8").digest("hex");
}

export function fighterAccountTokensEqual(plain: string, hash: string): boolean {
  const a = Buffer.from(hashFighterAccountToken(plain), "utf8");
  const b = Buffer.from(hash, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function buildFighterAccountSetupUrl(token: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";
  return `${base}/fighter/account/setup/${token}`;
}

export function buildFighterPasswordResetUrl(token: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";
  return `${base}/fighter/password/reset/${token}`;
}

export function buildFighterAccountSetupMessage(input: {
  fighterName: string;
  setupUrl: string;
  hoursValid?: number;
}): string {
  const hours = input.hoursValid ?? 24;
  return [
    `${input.fighterName} 선수님, MATCHON 계정 설정 링크입니다.`,
    "아래 링크에서 사용할 아이디와 비밀번호를 직접 설정해 주세요.",
    `링크는 ${hours}시간 동안 한 번만 사용할 수 있습니다.`,
    input.setupUrl,
  ].join("\n");
}

export function buildFighterPasswordResetMessage(input: {
  fighterName: string;
  resetUrl: string;
  hoursValid?: number;
}): string {
  const hours = input.hoursValid ?? 2;
  return [
    `${input.fighterName} 선수님, MATCHON 비밀번호 재설정 링크입니다.`,
    "아래 링크에서 새 비밀번호를 직접 설정해 주세요.",
    `링크는 ${hours}시간 동안 한 번만 사용할 수 있습니다.`,
    input.resetUrl,
  ].join("\n");
}

export type FighterAccountStatusKind =
  | "no_account"
  | "setup_link_active"
  | "setup_link_expired"
  | "active";

export const FIGHTER_ACCOUNT_STATUS_LABEL: Record<
  FighterAccountStatusKind,
  string
> = {
  no_account: "계정 미설정",
  setup_link_active: "설정 링크 발급",
  setup_link_expired: "링크 만료",
  active: "계정 사용 중",
};
