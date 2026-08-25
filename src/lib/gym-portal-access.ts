import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import { PermissionError } from "@/lib/auth/permission-error";
import {
  GymStatus,
  type AssociationMemberGymStatus as MemberStatus,
} from "@/lib/enums";
import {
  decideGymPortalAccessFromMembership,
  type MembershipGateDecision,
} from "@/lib/member-gym/portal-membership-gate";
import {
  isGymPortalOwner,
  requireGymOwner,
  requireGymStaff,
  requireRole,
} from "@/lib/permissions";
import { memberGymRepository } from "@/lib/repositories/member-gym.repository";
import { prisma } from "@/lib/prisma";

export type GymPortalAccessMode =
  | MembershipGateDecision["accessMode"]
  | "platform_suspended";

export type GymPortalAccess = {
  gymId: string;
  gym: {
    id: string;
    name: string;
    phone: string | null;
    address: string | null;
    status: GymStatus;
  };
  memberGym: {
    id: string;
    organizerId: string;
    status: MemberStatus;
    memberCode: string;
    ownerAccessSuspendedAt: Date | null;
  } | null;
  accessMode: GymPortalAccessMode;
  canEnterPortal: boolean;
  canRead: boolean;
  canCreateFighter: boolean;
  canUpdateFighter: boolean;
  canReleaseFighter: boolean;
  /** 직원·매출·체육관 설정·회원 쓰기 */
  canManageStaff: boolean;
  canManageSales: boolean;
  canManageGymSettings: boolean;
  canWriteMembers: boolean;
  bannerMessage: string | null;
  isOwner: boolean;
  gymStaffId: string | null;
};

function platformGymStatusBlocked(status: GymStatus): {
  accessMode: "platform_suspended";
  canEnterPortal: false;
  canRead: false;
  canCreateFighter: false;
  canUpdateFighter: false;
  canReleaseFighter: false;
  bannerMessage: string;
} {
  const message =
    status === GymStatus.archived
      ? "보관된 체육관 계정입니다. MATCHON 관리자에게 문의해 주세요."
      : "체육관 이용이 중지되었습니다. MATCHON 관리자에게 문의해 주세요.";
  return {
    accessMode: "platform_suspended",
    canEnterPortal: false,
    canRead: false,
    canCreateFighter: false,
    canUpdateFighter: false,
    canReleaseFighter: false,
    bannerMessage: message,
  };
}

function isPlaceholderOwner(user: {
  loginId: string | null;
  email: string | null;
  authUserId: string | null;
}): boolean {
  const login = user.loginId?.toLowerCase() ?? "";
  const email = user.email?.toLowerCase() ?? "";
  return (
    login.startsWith("manual-gym-") ||
    email.endsWith("@internal.invalid") ||
    !user.authUserId
  );
}

export { isPlaceholderOwner };

/** @deprecated import from portal-membership-gate — re-export for 기존 verify 호환 */
export { decideGymPortalAccessFromMembership };

function ownerCapabilityFlags(decision: MembershipGateDecision) {
  const writeOk =
    decision.canEnterPortal &&
    decision.canRead &&
    decision.accessMode !== "association_suspended";
  return {
    canManageStaff: writeOk,
    canManageSales: writeOk,
    canManageGymSettings: writeOk,
    canWriteMembers: writeOk,
    isOwner: true as const,
  };
}

/**
 * 일반 Gym은 기존 CRUD 유지.
 * AssociationMemberGym이 있는 Gym만 회원사 상태 게이트 적용.
 * gym_staff는 읽기 중심(담당 회원·향후 일정), 직원/매출/설정 차단.
 */
export async function resolveGymPortalAccess(
  actor: ActorContext,
): Promise<GymPortalAccess> {
  requireRole(actor, ["gym", "gym_staff", "admin"]);
  const gymId = actor.gymId;
  if (!gymId) {
    throw new PermissionError("FORBIDDEN", "체육관 계정 설정이 필요합니다.");
  }

  const asStaff = actor.role === "gym_staff";
  if (asStaff) {
    await requireGymStaff(actor, gymId);
  } else {
    await requireGymOwner(actor, gymId);
  }

  const gym = await prisma.gym.findUnique({
    where: { id: gymId },
    select: {
      id: true,
      name: true,
      phone: true,
      address: true,
      status: true,
    },
  });
  if (!gym) {
    throw new AppError("NOT_FOUND", "체육관을 찾을 수 없습니다.");
  }

  /** 플랫폼 GymStatus 게이트 — Association 연결과 별개 */
  if (gym.status !== GymStatus.active) {
    const blocked = platformGymStatusBlocked(gym.status);
    return {
      gymId,
      gym,
      memberGym: null,
      ...blocked,
      canManageStaff: false,
      canManageSales: false,
      canManageGymSettings: false,
      canWriteMembers: false,
      isOwner: !asStaff,
      gymStaffId: asStaff ? (actor.gymStaffId ?? null) : null,
    };
  }

  if (asStaff) {
    return {
      gymId,
      gym,
      memberGym: null,
      accessMode: "gym_staff",
      canEnterPortal: true,
      canRead: true,
      canCreateFighter: false,
      canUpdateFighter: false,
      canReleaseFighter: false,
      canManageStaff: false,
      canManageSales: false,
      canManageGymSettings: false,
      canWriteMembers: false,
      bannerMessage: null,
      isOwner: false,
      gymStaffId: actor.gymStaffId ?? null,
    };
  }

  const memberGym = await memberGymRepository.findMemberGymByGymId(gymId);
  const decision = decideGymPortalAccessFromMembership(
    memberGym
      ? {
          status: memberGym.status,
          ownerAccessSuspendedAt: memberGym.ownerAccessSuspendedAt,
        }
      : null,
  );

  return {
    gymId,
    gym,
    memberGym: memberGym
      ? {
          id: memberGym.id,
          organizerId: memberGym.organizerId,
          status: memberGym.status,
          memberCode: memberGym.memberCode,
          ownerAccessSuspendedAt: memberGym.ownerAccessSuspendedAt,
        }
      : null,
    ...decision,
    ...ownerCapabilityFlags(decision),
    // 관장도 GymStaff(userId) 연결이 있으면 "내 일정" 스코프에 사용한다.
    // createdByUserId 기준이 아니다.
    gymStaffId: await resolveOwnerLinkedGymStaffId(gymId, actor.userId),
  };
}

async function resolveOwnerLinkedGymStaffId(
  gymId: string,
  userId: string,
): Promise<string | null> {
  const linked = await prisma.gymStaff.findFirst({
    where: {
      gymId,
      userId,
      deletedAt: null,
    },
    select: { id: true },
  });
  return linked?.id ?? null;
}

export async function requireGymPortalRead(
  actor: ActorContext,
): Promise<GymPortalAccess> {
  if (actor.role === "gym_staff" && actor.mustChangePassword) {
    throw new PermissionError(
      "FORBIDDEN",
      "임시 비밀번호를 변경한 뒤 이용해 주세요.",
    );
  }
  const access = await resolveGymPortalAccess(actor);
  if (!access.canEnterPortal || !access.canRead) {
    throw new PermissionError(
      "FORBIDDEN",
      access.bannerMessage || "체육관 포털에 접근할 수 없습니다.",
    );
  }
  return access;
}

/**
 * 관장 쓰기 (회원·선수·출석·매출 등).
 * 선생님(gym_staff)은 Stage 1에서 차단.
 * association suspended 시 기존처럼 선수 변경 불가.
 */
export async function requireGymPortalWrite(
  actor: ActorContext,
): Promise<GymPortalAccess> {
  if (!isGymPortalOwner(actor) && actor.role !== "admin") {
    throw new PermissionError(
      "FORBIDDEN",
      "체육관 관장만 수정할 수 있습니다.",
    );
  }
  const access = await resolveGymPortalAccess(actor);
  if (!access.canEnterPortal) {
    throw new PermissionError(
      "FORBIDDEN",
      access.bannerMessage || "체육관 포털에 접근할 수 없습니다.",
    );
  }
  if (!access.canCreateFighter || !access.canUpdateFighter) {
    throw new PermissionError(
      "FORBIDDEN",
      access.bannerMessage ||
        "현재 회원사 상태에서는 선수 정보를 변경할 수 없습니다.",
    );
  }
  return access;
}

export async function requireGymPortalOwnerManage(
  actor: ActorContext,
): Promise<GymPortalAccess> {
  const access = await requireGymPortalWrite(actor);
  if (!access.canManageStaff) {
    throw new PermissionError("FORBIDDEN", "직원 관리 권한이 없습니다.");
  }
  return access;
}

/**
 * 매출·미수금 조회/관리 (관장·admin만).
 * gym_staff 직접 URL·서비스 호출 차단 SSOT.
 */
export async function requireGymPortalSalesManage(
  actor: ActorContext,
): Promise<GymPortalAccess> {
  const access = await requireGymPortalWrite(actor);
  if (!access.canManageSales) {
    throw new PermissionError("FORBIDDEN", "매출 관리 권한이 없습니다.");
  }
  return access;
}
