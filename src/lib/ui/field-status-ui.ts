import type { FieldStatusRowDTO } from "@/lib/services/field-status.service";
import type { MatchonStatus } from "@/lib/ui/matchon-status";
import type { StatusBadgeVariant } from "@/lib/ui/status-badge-ui";
import {
  CheckInStatus,
  WeighInFailureResolution,
  WeighInStatus,
  WeighInStatus as WeighInStatusEnum,
} from "@/generated/prisma";

/** 경기결과(현장·계체) 표시 톤 */
export type FieldFinalResultTone =
  | "pending"
  | "passed"
  | "failed_continue"
  | "failed_handicap"
  | "failed_cancelled"
  | "disqualified"
  | "confirmed"
  | "unknown";

export type FieldFinalResultUiToken = {
  label: string;
  badgeVariant: StatusBadgeVariant;
};

/** 경기결과 pill 배지 SSOT */
export const fieldFinalResultUiTokens: Record<
  FieldFinalResultTone,
  FieldFinalResultUiToken
> = {
  pending: {
    label: "미입력",
    badgeVariant: "resultPending",
  },
  passed: {
    label: "계체통과",
    badgeVariant: "resultPassed",
  },
  failed_continue: {
    label: "계체실패 · 경기진행",
    badgeVariant: "resultFailedContinue",
  },
  failed_handicap: {
    label: "계체실패 · 경기진행 · 핸디캡",
    badgeVariant: "resultFailedHandicap",
  },
  failed_cancelled: {
    label: "계체실패 · 경기취소",
    badgeVariant: "resultFailedCancelled",
  },
  disqualified: {
    label: "실격",
    badgeVariant: "resultDisqualified",
  },
  confirmed: {
    label: "출전확정",
    badgeVariant: "resultConfirmed",
  },
  unknown: {
    label: "상태확인",
    badgeVariant: "resultUnknown",
  },
};

export type WeighInStatusTone = "pending" | "passed" | "failed" | "disqualified";

export type WeighInStatusUiToken = {
  label: string;
  badgeVariant: StatusBadgeVariant;
};

/** 계체 상태 pill 배지 SSOT */
export const weighInStatusUiTokens: Record<
  WeighInStatusTone,
  WeighInStatusUiToken
> = {
  pending: {
    label: "계체 전",
    badgeVariant: "weighPending",
  },
  passed: {
    label: "계체통과",
    badgeVariant: "weighPassed",
  },
  failed: {
    label: "계체실패",
    badgeVariant: "weighFailed",
  },
  disqualified: {
    label: "실격",
    badgeVariant: "weighDisqualified",
  },
};

function isWeighInPassed(status: WeighInStatus): boolean {
  return (
    status === WeighInStatusEnum.pass ||
    status === WeighInStatusEnum.manual_pass
  );
}

function isWeighInFailed(status: WeighInStatus): boolean {
  return (
    status === WeighInStatusEnum.fail ||
    status === WeighInStatusEnum.manual_fail
  );
}

function hasWeighInInput(row: FieldStatusRowDTO): boolean {
  return (
    row.weighInWeightKg != null ||
    row.weighInStatus !== WeighInStatusEnum.pending ||
    row.weighInFailureResolution !== WeighInFailureResolution.pending ||
    Boolean(row.handicapNote?.trim())
  );
}

export function resolveWeighInStatusTone(
  status: WeighInStatus,
): WeighInStatusTone {
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
): StatusBadgeVariant {
  return weighInStatusUiTokens[resolveWeighInStatusTone(status)].badgeVariant;
}

export function resolveFieldFinalResultTone(
  row: FieldStatusRowDTO,
): FieldFinalResultTone {
  if (row.checkInStatus === CheckInStatus.disqualified) {
    return "disqualified";
  }

  if (row.weighInStatus === WeighInStatusEnum.manual_pass) {
    return "confirmed";
  }

  if (isWeighInPassed(row.weighInStatus)) {
    return "passed";
  }

  if (isWeighInFailed(row.weighInStatus)) {
    if (
      row.weighInFailureResolution ===
      WeighInFailureResolution.proceed_with_handicap
    ) {
      const note = row.handicapNote?.trim();
      return note ? "failed_handicap" : "failed_continue";
    }
    if (
      row.weighInFailureResolution === WeighInFailureResolution.cancel_match
    ) {
      return "failed_cancelled";
    }
    return "failed_continue";
  }

  if (!hasWeighInInput(row)) {
    return "pending";
  }

  return "pending";
}

export function getFieldFinalResultBadgeVariant(
  tone: FieldFinalResultTone,
): StatusBadgeVariant {
  return fieldFinalResultUiTokens[tone].badgeVariant;
}

export function getFieldFinalResultBaseLabel(
  tone: FieldFinalResultTone,
): string {
  return fieldFinalResultUiTokens[tone].label;
}

/** 계체 상태 → MatchonStatusBadge 표시용 */
export function resolveWeighInMatchonStatus(
  status: WeighInStatus,
): MatchonStatus {
  if (status === "pass" || status === "manual_pass") return "weigh_passed";
  if (status === "fail" || status === "manual_fail") return "weigh_failed";
  return "waiting";
}

/** 현장 확인 상태 → MatchonStatusBadge 표시용 */
export function resolveCheckInMatchonStatus(
  status: CheckInStatus,
): MatchonStatus {
  if (status === "checked_in") return "application_completed";
  if (status === "pending") return "waiting";
  if (status === "disqualified") return "disqualified";
  return "cancelled";
}

/** 체육관 현장·계체 화면 — rows 기반 요약 (표시 전용, API 변경 없음) */
export type GymFieldStatusSummary = {
  total: number;
  checkedIn: number;
  pendingCheckIn: number;
  weighInPass: number;
  weighInFail: number;
  eligible: number;
};

export function buildGymFieldStatusSummaryFromRows(
  rows: {
    checkInStatus: CheckInStatus;
    weighInStatus: WeighInStatus;
    isEligibleForBracket: boolean;
  }[],
): GymFieldStatusSummary {
  return {
    total: rows.length,
    checkedIn: rows.filter((r) => r.checkInStatus === CheckInStatus.checked_in)
      .length,
    pendingCheckIn: rows.filter((r) => r.checkInStatus === CheckInStatus.pending)
      .length,
    weighInPass: rows.filter(
      (r) =>
        r.weighInStatus === WeighInStatusEnum.pass ||
        r.weighInStatus === WeighInStatusEnum.manual_pass,
    ).length,
    weighInFail: rows.filter(
      (r) =>
        r.weighInStatus === WeighInStatusEnum.fail ||
        r.weighInStatus === WeighInStatusEnum.manual_fail,
    ).length,
    eligible: rows.filter((r) => r.isEligibleForBracket).length,
  };
}
