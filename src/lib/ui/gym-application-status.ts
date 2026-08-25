import type { GymApplicationStatus } from "@/lib/enums";
import type { MatchonStatus } from "@/lib/ui/matchon-status";

const GYM_APPLICATION_STATUS_LABELS: Record<GymApplicationStatus, string> = {
  pending: "승인대기",
  under_review: "검토중",
  approved: "승인",
  rejected: "반려",
  withdrawn: "철회",
};

export function getGymPlatformApplicationStatusLabel(
  status: GymApplicationStatus | string,
): string {
  return (
    GYM_APPLICATION_STATUS_LABELS[status as GymApplicationStatus] ?? status
  );
}

export function resolveGymPlatformApplicationStatusMatchon(
  status: GymApplicationStatus | string,
): MatchonStatus {
  switch (status) {
    case "approved":
      return "approved";
    case "rejected":
    case "withdrawn":
      return "unapproved";
    case "under_review":
      return "waiting";
    case "pending":
    default:
      return "application_pending";
  }
}

/** 관리자 목록 필터 — 승인대기 = pending + under_review */
export function isGymApplicationAwaitingReview(
  status: GymApplicationStatus | string,
): boolean {
  return status === "pending" || status === "under_review";
}
