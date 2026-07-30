import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const GYM_STAFF_ACCOUNT_SETUP_TTL_MS = 24 * 60 * 60 * 1000;
export const GYM_STAFF_PASSWORD_RESET_TTL_MS = 2 * 60 * 60 * 1000;

export function generateGymStaffAccountToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashGymStaffAccountToken(token: string): string {
  return createHash("sha256").update(token.trim(), "utf8").digest("hex");
}

export function gymStaffAccountTokensEqual(plain: string, hash: string): boolean {
  const a = Buffer.from(hashGymStaffAccountToken(plain), "utf8");
  const b = Buffer.from(hash, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function buildGymStaffAccountSetupUrl(token: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";
  return `${base}/gym-staff/account/setup/${token}`;
}

export function buildGymStaffPasswordResetUrl(token: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";
  return `${base}/gym-staff/password/reset/${token}`;
}

export function buildGymStaffAccountSetupMessage(input: {
  staffName: string;
  gymName: string;
  setupUrl: string;
  hoursValid?: number;
}): string {
  const hours = input.hoursValid ?? 24;
  return [
    `${input.staffName} 선생님, ${input.gymName} MATCHON 계정 설정 링크입니다.`,
    "아래 링크에서 사용할 아이디와 비밀번호를 직접 설정해 주세요.",
    `링크는 ${hours}시간 동안 한 번만 사용할 수 있습니다.`,
    input.setupUrl,
  ].join("\n");
}

export function buildGymStaffPasswordResetMessage(input: {
  staffName: string;
  resetUrl: string;
  hoursValid?: number;
}): string {
  const hours = input.hoursValid ?? 2;
  return [
    `${input.staffName} 선생님, MATCHON 비밀번호 재설정 링크입니다.`,
    "아래 링크에서 새 비밀번호를 직접 설정해 주세요.",
    `링크는 ${hours}시간 동안 한 번만 사용할 수 있습니다.`,
    input.resetUrl,
  ].join("\n");
}

/** 상태·라벨 SSOT는 클라이언트에서도 import 가능한 별도 모듈에 둔다. */
export {
  GYM_STAFF_ACCOUNT_STATUS_LABEL,
  type GymStaffAccountStatusKind,
} from "@/lib/gym-staff-account/status";
export { GYM_STAFF_ROLE_LABEL } from "@/lib/gym-staff/labels";
