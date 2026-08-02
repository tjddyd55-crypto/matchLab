import {
  AssociationMemberGymStatus,
  type AssociationMemberGymStatus as MemberStatus,
} from "@/lib/enums";

type PortalGateMembership = {
  status: AssociationMemberGymStatus;
  ownerAccessSuspendedAt: Date | null;
  updatedAt: Date;
};

type MembershipGateInput = {
  status: MemberStatus;
  ownerAccessSuspendedAt: Date | null;
};

export type MembershipGateDecision = {
  accessMode:
    | "normal_gym"
    | "association_active"
    | "association_suspended"
    | "association_withdrawn"
    | "association_owner_suspended"
    | "gym_staff";
  canEnterPortal: boolean;
  canRead: boolean;
  canCreateFighter: boolean;
  canUpdateFighter: boolean;
  canReleaseFighter: boolean;
  bannerMessage: string | null;
};

/**
 * 복수 협회 membership 중 포털 게이트에 쓸 1건 선택.
 * withdrawn만 있으면 null → 독립 체육관으로 취급.
 */
export function pickMembershipForPortalGate<T extends PortalGateMembership>(
  rows: T[],
): T | null {
  const nonWithdrawn = rows.filter(
    (r) => r.status !== AssociationMemberGymStatus.withdrawn,
  );
  if (nonWithdrawn.length === 0) return null;

  const byUpdatedDesc = (a: T, b: T) =>
    b.updatedAt.getTime() - a.updatedAt.getTime();

  const unrestricted = nonWithdrawn.filter(
    (r) =>
      !r.ownerAccessSuspendedAt &&
      r.status !== AssociationMemberGymStatus.suspended,
  );
  if (unrestricted.length > 0) {
    return [...unrestricted].sort(byUpdatedDesc)[0] ?? null;
  }

  const readable = nonWithdrawn.filter((r) => !r.ownerAccessSuspendedAt);
  if (readable.length > 0) {
    return [...readable].sort(byUpdatedDesc)[0] ?? null;
  }

  return [...nonWithdrawn].sort(byUpdatedDesc)[0] ?? null;
}

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

  // 연결 해제(withdrawn)는 독립 체육관과 동일 — 다른 협회 가입/미가입에 영향 없음
  if (memberGym.status === AssociationMemberGymStatus.withdrawn) {
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

  // pending / on_hold / active — 승인 대기·보류만으로 포털을 잠그지 않는다.
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
