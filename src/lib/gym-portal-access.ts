import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import { PermissionError } from "@/lib/auth/permission-error";
import {
  AssociationMemberGymStatus,
  type AssociationMemberGymStatus as MemberStatus,
} from "@/lib/enums";
import { requireGymOwner, requireRole } from "@/lib/permissions";
import { memberGymRepository } from "@/lib/repositories/member-gym.repository";
import { prisma } from "@/lib/prisma";

export type GymPortalAccessMode =
  | "normal_gym"
  | "association_active"
  | "association_suspended"
  | "association_withdrawn"
  | "association_owner_suspended";

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
  bannerMessage: string | null;
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

/**
 * 일반 Gym은 기존 CRUD 유지.
 * AssociationMemberGym이 있는 Gym만 회원사 상태 게이트 적용.
 */
export async function resolveGymPortalAccess(
  actor: ActorContext,
): Promise<GymPortalAccess> {
  requireRole(actor, ["gym", "admin"]);
  const gymId = actor.gymId;
  if (!gymId) {
    throw new PermissionError("FORBIDDEN", "체육관 계정 설정이 필요합니다.");
  }
  await requireGymOwner(actor, gymId);

  const gym = await prisma.gym.findUnique({
    where: { id: gymId },
    select: { id: true, name: true, phone: true, address: true },
  });
  if (!gym) {
    throw new AppError("NOT_FOUND", "체육관을 찾을 수 없습니다.");
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

export async function requireGymPortalWrite(
  actor: ActorContext,
): Promise<GymPortalAccess> {
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
