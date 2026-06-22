import type { WeighInStatus } from "@/generated/prisma";
import type { MatchStatusBadgeVariant } from "@/lib/ui/match-status-ui";

export type FieldStatusTone =
  | "pending"
  | "passed"
  | "failed"
  | "disqualified"
  | "confirmed"
  | "absent"
  | "withdrawn";

export type FieldStatusUiToken = {
  label: string;
  badgeVariant: MatchStatusBadgeVariant;
};

/** 현장·계체 상태 배지 SSOT */
export const fieldStatusUiTokens: Record<FieldStatusTone, FieldStatusUiToken> = {
  pending: {
    label: "계체 전",
    badgeVariant: "matchWaiting",
  },
  passed: {
    label: "계체 통과",
    badgeVariant: "matchFinished",
  },
  failed: {
    label: "계체 실패",
    badgeVariant: "matchCancelled",
  },
  disqualified: {
    label: "실격",
    badgeVariant: "matchCancelled",
  },
  confirmed: {
    label: "출전확정",
    badgeVariant: "matchOngoing",
  },
  absent: {
    label: "미출석",
    badgeVariant: "matchCancelled",
  },
  withdrawn: {
    label: "신청철회",
    badgeVariant: "matchCancelled",
  },
};

export function resolveWeighInStatusTone(
  status: WeighInStatus,
): FieldStatusTone {
  switch (status) {
    case "pass":
    case "manual_pass":
      return "passed";
    case "fail":
    case "manual_fail":
      return "failed";
    case "pending":
    default:
      return "pending";
  }
}

export function getWeighInStatusBadgeVariant(
  status: WeighInStatus,
): MatchStatusBadgeVariant {
  return fieldStatusUiTokens[resolveWeighInStatusTone(status)].badgeVariant;
}
