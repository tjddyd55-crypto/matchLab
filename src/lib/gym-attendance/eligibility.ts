import {
  computeGymMemberMembershipStatus,
  type GymMemberMembershipDisplayStatus,
  type GymMemberStoredStatus,
} from "@/lib/gym-member-membership-status";

export type AttendanceEligibilityDecision =
  | {
      allow: true;
      membershipStatus: GymMemberMembershipDisplayStatus;
      needsDeskNotice: boolean;
      deskNoticeKind: "expired" | "paused" | "no_plan" | null;
    }
  | {
      allow: false;
      membershipStatus: GymMemberMembershipDisplayStatus;
      reason: "withdrawn" | "deleted" | "paused_blocked" | "expired_blocked";
    };

/**
 * 출석 가능 여부.
 * - withdrawn / soft-delete: 차단
 * - expired / paused: 키오스크 설정에 따라 기록 허용 + 데스크 안내
 * - no_plan: 기록 허용 + 데스크 안내(이용권 확인)
 * - active / expiring: 정상 출석
 */
export function decideGymAttendanceEligibility(input: {
  deletedAt: Date | null | undefined;
  memberStatus: GymMemberStoredStatus;
  endsAt: Date | string | null | undefined;
  allowExpiredMember: boolean;
  allowPausedMember: boolean;
  todayUtc?: Date;
}): AttendanceEligibilityDecision {
  if (input.deletedAt) {
    return {
      allow: false,
      membershipStatus: "withdrawn",
      reason: "deleted",
    };
  }

  const membershipStatus = computeGymMemberMembershipStatus({
    memberStatus: input.memberStatus,
    endsAt: input.endsAt,
    todayUtc: input.todayUtc,
  });

  if (membershipStatus === "withdrawn") {
    return { allow: false, membershipStatus, reason: "withdrawn" };
  }

  if (membershipStatus === "paused") {
    if (!input.allowPausedMember) {
      return { allow: false, membershipStatus, reason: "paused_blocked" };
    }
    return {
      allow: true,
      membershipStatus,
      needsDeskNotice: true,
      deskNoticeKind: "paused",
    };
  }

  if (membershipStatus === "expired") {
    if (!input.allowExpiredMember) {
      return { allow: false, membershipStatus, reason: "expired_blocked" };
    }
    return {
      allow: true,
      membershipStatus,
      needsDeskNotice: true,
      deskNoticeKind: "expired",
    };
  }

  if (membershipStatus === "no_plan") {
    return {
      allow: true,
      membershipStatus,
      needsDeskNotice: true,
      deskNoticeKind: "no_plan",
    };
  }

  return {
    allow: true,
    membershipStatus,
    needsDeskNotice: false,
    deskNoticeKind: null,
  };
}

export function attendanceDeskMessage(
  kind: "expired" | "paused" | "no_plan" | null,
): string | null {
  switch (kind) {
    case "expired":
      return "이용권이 만료되어 데스크 확인이 필요합니다.";
    case "paused":
      return "휴회 상태입니다. 데스크 확인이 필요합니다.";
    case "no_plan":
      return "이용권 확인을 위해 데스크에 문의해 주세요.";
    default:
      return null;
  }
}
