import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import { PermissionError } from "@/lib/auth/permission-error";
import {
  AssociationMemberGymStatus,
  type AssociationMemberGymStatus as MemberStatus,
} from "@/lib/enums";
import {
  isGymPortalOwner,
  requireGymOwner,
  requireGymStaff,
  requireRole,
} from "@/lib/permissions";
import { memberGymRepository } from "@/lib/repositories/member-gym.repository";
import { prisma } from "@/lib/prisma";

export type GymPortalAccessMode =
  | "normal_gym"
  | "association_active"
  | "association_suspended"
  | "association_withdrawn"
  | "association_owner_suspended"
  | "gym_staff";

export type GymPortalAccess = {
  gymId: string;
  gym: { id: string; name: string; phone: string | null; address: string | null };
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

type MembershipGateInput = {
  status: MemberStatus;
  ownerAccessSuspendedAt: Date | null;
};

type MembershipGateDecision = Pick<
  GymPortalAccess,
  | "accessMode"
  | "canEnterPortal"
  | "canRead"
  | "canCreateFighter"
  | "canUpdateFighter"
  | "canReleaseFighter"
  | "bannerMessage"
>;

/** AssociationMemberGym 유무·상태에 따른 포털 권한 (순수 로직, 검증용). */
export function decideGymPortalAccessFromMembership(
  memberGym: MembershipGateInput | null,
): MembershipGateDecision {
  if (!memberGym) {
    return {
      accessMode: "normal_gym",
      canEnterPortal: true,
      canRead: true,
      canCreateFighter: true,
      canUpdateFighter: true,
      canReleaseFighter: true,
      bannerMessage: null,
    };
  }

  if (memberGym.status === AssociationMemberGymStatus.withdrawn) {
    return {
      accessMode: "association_withdrawn",
      canEnterPortal: false,
      canRead: false,
      canCreateFighter: false,
      canUpdateFighter: false,
      canReleaseFighter: false,
      bannerMessage: "탈퇴 처리된 회원사입니다. 협회에 문의해 주세요.",
    };
  }

  if (memberGym.ownerAccessSuspendedAt) {
    return {
      accessMode: "association_owner_suspended",
      canEnterPortal: false,
      canRead: false,
      canCreateFighter: false,
      canUpdateFighter: false,
      canReleaseFighter: false,
      bannerMessage:
        "회원사 계정 접근이 중지되었습니다. 협회에 문의해 주세요.",
    };
  }

  if (memberGym.status === AssociationMemberGymStatus.suspended) {
    return {
      accessMode: "association_suspended",
      canEnterPortal: true,
      canRead: true,
      canCreateFighter: false,
      canUpdateFighter: false,
      canReleaseFighter: false,
      bannerMessage:
        "현재 회원사 활동이 중지되어 선수 정보를 조회만 할 수 있습니다.",
    };
  }

  return {
    accessMode: "association_active",
    canEnterPortal: true,
    canRead: true,
    canCreateFighter: true,
    canUpdateFighter: true,
    canReleaseFighter: true,
    bannerMessage: null,
  };
}

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
    select: { id: true, name: true, phone: true, address: true },
  });
  if (!gym) {
    throw new AppError("NOT_FOUND", "체육관을 찾을 수 없습니다.");
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
    gymStaffId: null,
  };
}

export async function requireGymPortalRead(
  actor: ActorContext,
): Promise<GymPortalAccess> {
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
