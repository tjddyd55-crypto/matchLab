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
  unlinked: "계정 미연결",
  placeholder: "계정 미연결",
  invite_pending: "초대 대기",
  connected: "정상 연결",
  access_suspended: "접근 중지",
};

export function isInternalPlaceholderEmail(
  email: string | null | undefined,
): boolean {
  if (!email) return false;
  const e = email.toLowerCase();
  return e.endsWith("@internal.invalid") || e.startsWith("manual-gym-");
}

export function isPlaceholderGymOwnerUser(user: {
  loginId?: string | null;
  email?: string | null;
  authUserId?: string | null;
}): boolean {
  const login = user.loginId?.toLowerCase() ?? "";
  if (login.startsWith("manual-gym-")) return true;
  if (isInternalPlaceholderEmail(user.email)) return true;
  if (!user.authUserId) return true;
  return false;
}

function firstNonEmpty(
  ...values: Array<string | null | undefined>
): string | null {
  for (const v of values) {
    const t = v?.trim();
    if (t) return t;
  }
  return null;
}

/** 관리 화면·초대 기본값용 표시 SSOT (placeholder 이메일·phone 덮어쓰기 금지) */
export function resolveMemberGymOwnerDisplay(input: {
  owner: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    loginId?: string | null;
    authUserId?: string | null;
    role?: string | null;
  } | null;
  gymName?: string | null;
  gymPhone?: string | null;
  inviteEmail?: string | null;
  inviteName?: string | null;
  invitePhone?: string | null;
  application?: {
    ownerName?: string | null;
    email?: string | null;
    phone?: string | null;
    contactPhone?: string | null;
  } | null;
}): {
  displayName: string;
  displayEmail: string;
  displayPhone: string;
  roleLabel: string;
  inviteDefaults: { name: string; email: string; phone: string };
} {
  const placeholder = input.owner
    ? isPlaceholderGymOwnerUser(input.owner)
    : true;

  const realOwnerEmail =
    input.owner?.email && !isInternalPlaceholderEmail(input.owner.email)
      ? input.owner.email
      : null;
  const realOwnerPhone =
    !placeholder && input.owner?.phone ? input.owner.phone : null;
  const realOwnerName =
    !placeholder && input.owner?.name ? input.owner.name : null;

  const displayName =
    firstNonEmpty(
      realOwnerName,
      input.inviteName,
      input.application?.ownerName,
      !placeholder ? input.owner?.name : null,
      input.gymName,
    ) ?? "미등록";

  const displayEmail =
    firstNonEmpty(
      realOwnerEmail,
      input.inviteEmail && !isInternalPlaceholderEmail(input.inviteEmail)
        ? input.inviteEmail
        : null,
      input.application?.email &&
        !isInternalPlaceholderEmail(input.application.email)
        ? input.application.email
        : null,
    ) ?? "미등록";

  const displayPhone =
    firstNonEmpty(
      realOwnerPhone,
      input.invitePhone,
      input.application?.phone,
      input.application?.contactPhone,
      input.gymPhone,
    ) ?? "미등록";

  const inviteDefaults = {
    name:
      firstNonEmpty(
        input.inviteName,
        input.application?.ownerName,
        input.gymName,
      ) ?? "",
    email:
      firstNonEmpty(
        input.inviteEmail && !isInternalPlaceholderEmail(input.inviteEmail)
          ? input.inviteEmail
          : null,
        input.application?.email &&
          !isInternalPlaceholderEmail(input.application.email)
          ? input.application.email
          : null,
      ) ?? "",
    phone:
      firstNonEmpty(
        input.invitePhone,
        input.application?.phone,
        input.application?.contactPhone,
        input.gymPhone,
      ) ?? "",
  };

  return {
    displayName,
    displayEmail,
    displayPhone,
    roleLabel: "회원사 관리자",
    inviteDefaults,
  };
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
