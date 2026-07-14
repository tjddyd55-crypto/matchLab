import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export type MemberGymOwnerAccountStatus =
  | "unlinked"
  | "placeholder"
  | "invite_pending"
  | "connected"
  | "access_suspended";

export const MEMBER_GYM_OWNER_ACCOUNT_STATUS_LABEL: Record<
  MemberGymOwnerAccountStatus,
  string
> = {
  unlinked: "미연결",
  placeholder: "임시 계정",
  invite_pending: "초대 대기",
  connected: "정상 연결",
  access_suspended: "접근 중지",
};

export function isPlaceholderGymOwnerUser(user: {
  loginId?: string | null;
  email?: string | null;
  authUserId?: string | null;
}): boolean {
  const login = user.loginId?.toLowerCase() ?? "";
  const email = user.email?.toLowerCase() ?? "";
  if (login.startsWith("manual-gym-")) return true;
  if (email.endsWith("@internal.invalid")) return true;
  if (!user.authUserId) return true;
  return false;
}

export function resolveMemberGymOwnerAccountStatus(input: {
  owner: {
    loginId?: string | null;
    email?: string | null;
    authUserId?: string | null;
  } | null;
  ownerAccessSuspendedAt?: Date | null;
  ownerInviteTokenHash?: string | null;
  ownerInviteExpiresAt?: Date | null;
}): MemberGymOwnerAccountStatus {
  if (input.ownerAccessSuspendedAt) return "access_suspended";
  if (
    input.ownerInviteTokenHash &&
    input.ownerInviteExpiresAt &&
    input.ownerInviteExpiresAt.getTime() > Date.now()
  ) {
    return "invite_pending";
  }
  if (!input.owner) return "unlinked";
  if (isPlaceholderGymOwnerUser(input.owner)) return "placeholder";
  return "connected";
}

export function generateMemberGymOwnerInviteToken(): string {
  return randomBytes(24).toString("hex");
}

export function hashMemberGymOwnerInviteToken(token: string): string {
  return createHash("sha256").update(token.trim(), "utf8").digest("hex");
}

export function memberGymOwnerInviteTokensEqual(
  plain: string,
  hash: string,
): boolean {
  const a = Buffer.from(hashMemberGymOwnerInviteToken(plain), "utf8");
  const b = Buffer.from(hash, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function buildMemberGymOwnerInviteUrl(token: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";
  return `${base}/gym-owner-invite/${token}`;
}

export const MEMBER_GYM_OWNER_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
