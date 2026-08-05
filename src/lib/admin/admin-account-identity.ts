import "server-only";

import { isPlaceholderGymOwnerUser } from "@/lib/member-gym/owner-account";
import { normalizeKrMobileCanonical, normalizePhoneDigits } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { normalizeLoginId } from "@/lib/validators/login-id.validator";
import {
  GymStatus,
  OrganizerStatus,
  OrganizerType,
  UserRole,
} from "@/lib/enums";

export type AdminAccountIdentitySource =
  | "linked_user"
  | "inquiry_login_id"
  | "application_pending_activation"
  | "unresolved"
  | "ambiguous";

export type AdminAccountIdentity = {
  userId: string | null;
  loginId: string | null;
  submittedLoginId: string | null;
  accountType: "association" | "gym" | null;
  accountName: string | null;
  representativeName: string | null;
  phoneMasked: string | null;
  emailMasked: string | null;
  source: AdminAccountIdentitySource;
  resolutionStatus: "confirmed" | "needs_review" | "unresolved" | "ambiguous";
  resetEligible: boolean;
  hint: string | null;
};

type UserIdentityRow = {
  id: string;
  loginId: string | null;
  authUserId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  organizer: {
    id: string;
    name: string;
    type: OrganizerType;
    status: OrganizerStatus;
  } | null;
  ownedGym: {
    id: string;
    name: string;
    status: GymStatus;
  } | null;
};

const USER_IDENTITY_SELECT = {
  id: true,
  loginId: true,
  authUserId: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  organizer: {
    select: { id: true, name: true, type: true, status: true },
  },
  ownedGym: { select: { id: true, name: true, status: true } },
} as const;

function maskEmail(email: string | null | undefined): string | null {
  const e = email?.trim();
  if (!e || e.includes("@internal.")) return null;
  const [local, domain] = e.split("@");
  if (!domain) return "***";
  const head = local.slice(0, Math.min(2, local.length));
  return `${head}***@${domain}`;
}

function maskPhone(phone: string | null | undefined): string | null {
  const digits = normalizePhoneDigits(phone ?? "");
  if (digits.length < 7) return phone?.trim() || null;
  return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
}

function emptyIdentity(
  overrides: Partial<AdminAccountIdentity> = {},
): AdminAccountIdentity {
  return {
    userId: null,
    loginId: null,
    submittedLoginId: null,
    accountType: null,
    accountName: null,
    representativeName: null,
    phoneMasked: null,
    emailMasked: null,
    source: "unresolved",
    resolutionStatus: "unresolved",
    resetEligible: false,
    hint: "문의자가 로그인 아이디를 입력하지 않았거나 일치하는 계정을 찾을 수 없습니다.",
    ...overrides,
  };
}

function classifyOwnerAccount(user: UserIdentityRow): {
  accountType: "association" | "gym" | null;
  accountName: string | null;
  pendingActivation: boolean;
  resetEligible: boolean;
} {
  const placeholder = isPlaceholderGymOwnerUser(user);
  if (
    user.role === UserRole.organizer &&
    user.organizer?.type === OrganizerType.association
  ) {
    return {
      accountType: "association",
      accountName: user.organizer.name,
      pendingActivation: placeholder || !user.loginId || !user.authUserId,
      resetEligible: Boolean(user.loginId && user.authUserId && !placeholder),
    };
  }
  if (user.role === UserRole.gym && user.ownedGym) {
    return {
      accountType: "gym",
      accountName: user.ownedGym.name,
      pendingActivation: placeholder || !user.loginId || !user.authUserId,
      resetEligible: Boolean(user.loginId && user.authUserId && !placeholder),
    };
  }
  return {
    accountType: null,
    accountName: null,
    pendingActivation: false,
    resetEligible: false,
  };
}

function fromUser(
  user: UserIdentityRow,
  source: AdminAccountIdentitySource,
  submittedLoginId: string | null,
): AdminAccountIdentity {
  const classified = classifyOwnerAccount(user);
  if (classified.pendingActivation) {
    return {
      userId: user.id,
      loginId: user.loginId && !user.loginId.startsWith("pending-gym-")
        ? user.loginId
        : null,
      submittedLoginId,
      accountType: classified.accountType,
      accountName: classified.accountName,
      representativeName: user.name,
      phoneMasked: maskPhone(user.phone),
      emailMasked: maskEmail(user.email),
      source: "application_pending_activation",
      resolutionStatus: "needs_review",
      resetEligible: false,
      hint: "로그인 아이디: 계정 생성 전",
    };
  }
  if (!classified.accountType || !classified.resetEligible) {
    return emptyIdentity({
      submittedLoginId,
      source,
      loginId: user.loginId,
      representativeName: user.name,
      resolutionStatus: "needs_review",
      hint: "협회 대표 또는 체육관 owner 계정이 아니거나 아직 활성화되지 않았습니다.",
    });
  }
  return {
    userId: user.id,
    loginId: user.loginId,
    submittedLoginId,
    accountType: classified.accountType,
    accountName: classified.accountName,
    representativeName: user.name,
    phoneMasked: maskPhone(user.phone),
    emailMasked: maskEmail(user.email),
    source: "linked_user",
    resolutionStatus: "confirmed",
    resetEligible: true,
    hint: null,
  };
}

async function findUsersByLoginId(loginIdRaw: string): Promise<UserIdentityRow[]> {
  const loginId = normalizeLoginId(loginIdRaw);
  if (!loginId) return [];
  return prisma.user.findMany({
    where: { loginId },
    select: USER_IDENTITY_SELECT,
    take: 5,
  });
}

function contactAsEmail(contact: string): string | null {
  const v = contact.trim().toLowerCase();
  return v.includes("@") ? v : null;
}

function contactAsPhone(contact: string): string | null {
  const canonical = normalizeKrMobileCanonical(contact);
  return canonical.length >= 10 ? canonical : null;
}

async function findExactHeuristicMatches(input: {
  name: string;
  contact: string;
}): Promise<UserIdentityRow[]> {
  const name = input.name.trim();
  const email = contactAsEmail(input.contact);
  const phone = contactAsPhone(input.contact);
  // contact may be "phone / email" style — try split
  const parts = input.contact
    .split(/[\/,\s]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const emails = [
    ...(email ? [email] : []),
    ...parts.map(contactAsEmail).filter((v): v is string => Boolean(v)),
  ];
  const phones = [
    ...(phone ? [phone] : []),
    ...parts.map(contactAsPhone).filter((v): v is string => Boolean(v)),
  ];
  const emailOnly = emails[0] ?? null;
  const phoneOnly = phones[0] ?? null;
  if (!name && !(emailOnly && phoneOnly)) {
    if (!emailOnly && !phoneOnly) return [];
  }

  const or: Array<{ email?: string; phone?: string | { contains: string } }> =
    [];
  if (emailOnly) or.push({ email: emailOnly });
  if (phoneOnly) {
    or.push({ phone: phoneOnly });
    or.push({ phone: { contains: phoneOnly.slice(-8) } });
  }
  if (or.length === 0) return [];

  const candidates = await prisma.user.findMany({
    where: {
      ...(name ? { name } : {}),
      OR: or,
    },
    select: USER_IDENTITY_SELECT,
    take: 8,
  });

  return candidates.filter((user) => {
    const nameOk = !name || user.name.trim() === name;
    const emailOk = emailOnly
      ? (user.email ?? "").trim().toLowerCase() === emailOnly
      : false;
    const userPhone = normalizeKrMobileCanonical(user.phone);
    const phoneOk = phoneOnly ? userPhone === phoneOnly : false;
    if (emailOnly && phoneOnly && !name) return emailOk && phoneOk;
    if (emailOnly && phoneOnly) return nameOk && emailOk && phoneOk;
    if (emailOnly) return nameOk && emailOk;
    if (phoneOnly) return nameOk && phoneOk;
    return false;
  });
}

export async function resolveAdminAccountIdentityFromInquiry(input: {
  loginId: string | null;
  name: string;
  contact: string;
}): Promise<AdminAccountIdentity> {
  const submitted = input.loginId?.trim() ? normalizeLoginId(input.loginId) : null;

  if (submitted) {
    const byLogin = await findUsersByLoginId(submitted);
    if (byLogin.length > 1) {
      return emptyIdentity({
        submittedLoginId: submitted,
        loginId: submitted,
        source: "ambiguous",
        resolutionStatus: "ambiguous",
        hint: "같은 로그인 아이디로 여러 계정이 매칭됩니다. 수동으로 확인해 주세요.",
      });
    }
    if (byLogin.length === 1) {
      return fromUser(byLogin[0]!, "inquiry_login_id", submitted);
    }
    return emptyIdentity({
      submittedLoginId: submitted,
      loginId: submitted,
      source: "inquiry_login_id",
      resolutionStatus: "needs_review",
      hint: "문의자가 입력한 로그인 아이디입니다. 계정 확인이 필요합니다.",
    });
  }

  const heuristic = await findExactHeuristicMatches({
    name: input.name,
    contact: input.contact,
  });
  const eligible = heuristic.filter((u) => classifyOwnerAccount(u).accountType);
  if (eligible.length > 1) {
    return emptyIdentity({
      source: "ambiguous",
      resolutionStatus: "ambiguous",
      hint: "이름·연락처로 여러 계정이 매칭됩니다. 자동 연결하지 않습니다.",
    });
  }
  if (eligible.length === 1) {
    return fromUser(eligible[0]!, "linked_user", null);
  }
  return emptyIdentity();
}

export async function resolveAdminAccountIdentityFromUserId(
  userId: string,
): Promise<AdminAccountIdentity> {
  const user = await prisma.user.findFirst({
    where: { id: userId },
    select: USER_IDENTITY_SELECT,
  });
  if (!user) return emptyIdentity({ hint: "계정을 찾을 수 없습니다." });
  return fromUser(user, "linked_user", user.loginId);
}

export async function resolveAdminAccountIdentityFromAssociationApplication(input: {
  createdOrganizerId: string | null;
  requestedLoginId?: string | null;
}): Promise<AdminAccountIdentity> {
  const requested = input.requestedLoginId?.trim()
    ? normalizeLoginId(input.requestedLoginId)
    : null;

  if (!input.createdOrganizerId) {
    return emptyIdentity({
      submittedLoginId: requested,
      loginId: requested,
      source: requested ? "inquiry_login_id" : "application_pending_activation",
      resolutionStatus: "needs_review",
      hint: requested
        ? "승인 전이거나 아직 계정이 생성되지 않았습니다."
        : "신청 로그인 아이디 기록이 없거나 아직 계정이 생성되지 않았습니다.",
    });
  }
  const organizer = await prisma.organizer.findFirst({
    where: { id: input.createdOrganizerId },
    select: {
      name: true,
      user: { select: USER_IDENTITY_SELECT },
    },
  });
  if (!organizer?.user) {
    return emptyIdentity({
      submittedLoginId: requested,
      hint: "연결된 협회 계정을 찾을 수 없습니다.",
    });
  }
  return fromUser(organizer.user, "linked_user", requested ?? organizer.user.loginId);
}

export async function resolveAdminAccountIdentityFromGymApplication(input: {
  createdGymId: string | null;
  requestedLoginId?: string | null;
}): Promise<AdminAccountIdentity> {
  const requested = input.requestedLoginId?.trim()
    ? normalizeLoginId(input.requestedLoginId)
    : null;

  if (!input.createdGymId) {
    return emptyIdentity({
      submittedLoginId: requested,
      loginId: requested,
      source: requested ? "inquiry_login_id" : "application_pending_activation",
      resolutionStatus: "needs_review",
      hint: requested
        ? "승인 전이거나 아직 계정이 생성되지 않았습니다."
        : "신청 로그인 아이디 기록이 없거나 아직 계정이 생성되지 않았습니다.",
    });
  }
  const gym = await prisma.gym.findFirst({
    where: { id: input.createdGymId },
    select: {
      name: true,
      ownerUser: { select: USER_IDENTITY_SELECT },
    },
  });
  if (!gym?.ownerUser) {
    return emptyIdentity({
      submittedLoginId: requested,
      hint: "연결된 체육관 계정을 찾을 수 없습니다.",
    });
  }
  return fromUser(gym.ownerUser, "linked_user", requested ?? gym.ownerUser.loginId);
}

export function formatAdminLoginIdLabel(identity: AdminAccountIdentity): string {
  if (identity.resolutionStatus === "unresolved") return "확인 불가";
  if (identity.resolutionStatus === "ambiguous") return "확인 필요";
  if (identity.loginId && !identity.loginId.startsWith("pending-gym-")) {
    return identity.loginId;
  }
  if (identity.submittedLoginId) return identity.submittedLoginId;
  if (identity.source === "application_pending_activation") return "계정 생성 전";
  return "확인 불가";
}
