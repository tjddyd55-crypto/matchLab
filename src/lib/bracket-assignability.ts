import {
  ApplicationCancellationSource,
  ApplicationStatus,
  CheckInStatus,
  WeighInFailureResolution,
  WeighInStatus,
} from "@/generated/prisma";

export type BracketAssignabilityInput = {
  checkInStatus: CheckInStatus;
  weighInStatus: WeighInStatus;
  weighInFailureResolution?: WeighInFailureResolution | null;
  applicationStatus?: ApplicationStatus;
  cancellationSource?: ApplicationCancellationSource | null;
  weighInWeightKg?: number | null;
};

export type BracketAssignability = {
  isAssignable: boolean;
  label: string;
  disabledReason?: string;
  warningReason?: string;
};

export const BRACKET_ASSIGNABILITY_DISABLED_REASON = {
  disqualified: "실격 처리된 선수입니다.",
  matchCancelled: "경기취소 처리된 선수입니다.",
  withdrawn: "신청철회 선수입니다.",
  absent: "미출석 선수입니다.",
  cancelledByGym: "체육관취소 선수입니다.",
  cancelledByOrganizer: "주최측취소 선수입니다.",
  weighInFailedMatchCancelled:
    "계체실패 후 경기취소 처리된 선수입니다.",
  notApprovedApplicant: "해당 이벤트 신청자가 아닙니다.",
} as const;

/**
 * 대진 배치 가능 여부 — 출전 확정(`computeFieldEligibility`)과 분리된 SSOT.
 * 현장확인 전·계체 전은 배치 가능(warning), 실격·경기취소 등은 배치 불가.
 */
export function computeBracketAssignability(
  input: BracketAssignabilityInput,
): BracketAssignability {
  if (input.applicationStatus === ApplicationStatus.cancelled) {
    if (input.cancellationSource === ApplicationCancellationSource.gym) {
      return {
        isAssignable: false,
        label: "체육관취소",
        disabledReason: BRACKET_ASSIGNABILITY_DISABLED_REASON.cancelledByGym,
      };
    }
    if (input.cancellationSource === ApplicationCancellationSource.organizer) {
      return {
        isAssignable: false,
        label: "주최측취소",
        disabledReason:
          BRACKET_ASSIGNABILITY_DISABLED_REASON.cancelledByOrganizer,
      };
    }
    return {
      isAssignable: false,
      label: "신청취소",
      disabledReason: BRACKET_ASSIGNABILITY_DISABLED_REASON.matchCancelled,
    };
  }

  if (
    input.applicationStatus != null &&
    input.applicationStatus !== ApplicationStatus.approved
  ) {
    return {
      isAssignable: false,
      label: "미승인",
      disabledReason: BRACKET_ASSIGNABILITY_DISABLED_REASON.notApprovedApplicant,
    };
  }

  if (input.checkInStatus === CheckInStatus.disqualified) {
    return {
      isAssignable: false,
      label: "실격",
      disabledReason: BRACKET_ASSIGNABILITY_DISABLED_REASON.disqualified,
    };
  }

  if (input.checkInStatus === CheckInStatus.withdrawn) {
    return {
      isAssignable: false,
      label: "신청철회",
      disabledReason: BRACKET_ASSIGNABILITY_DISABLED_REASON.withdrawn,
    };
  }

  if (input.checkInStatus === CheckInStatus.no_show) {
    return {
      isAssignable: false,
      label: "미출석",
      disabledReason: BRACKET_ASSIGNABILITY_DISABLED_REASON.absent,
    };
  }

  if (
    input.weighInFailureResolution === WeighInFailureResolution.cancel_match
  ) {
    return {
      isAssignable: false,
      label: "경기취소",
      disabledReason:
        BRACKET_ASSIGNABILITY_DISABLED_REASON.weighInFailedMatchCancelled,
    };
  }

  const warnings: string[] = [];

  if (input.checkInStatus === CheckInStatus.pending) {
    warnings.push("현장 확인이 완료되지 않았습니다.");
  }

  if (input.weighInStatus === WeighInStatus.pending) {
    warnings.push("계체가 완료되지 않았습니다.");
  }

  if (
    input.weighInStatus === WeighInStatus.pending &&
    (input.weighInWeightKg === null || input.weighInWeightKg === undefined)
  ) {
    warnings.push("계체 몸무게가 입력되지 않았습니다.");
  }

  let label = "대진 가능";
  if (input.checkInStatus === CheckInStatus.pending) {
    label = "현장 미확인";
  } else if (input.weighInStatus === WeighInStatus.pending) {
    label = "계체 전";
  } else if (
    input.weighInStatus === WeighInStatus.fail ||
    input.weighInStatus === WeighInStatus.manual_fail
  ) {
    if (
      input.weighInFailureResolution ===
      WeighInFailureResolution.proceed_with_handicap
    ) {
      label = "계체 실패 · 경기진행";
    } else {
      label = "계체 실패";
    }
  }

  return {
    isAssignable: true,
    label,
    warningReason:
      warnings.length > 0 ? warnings.join(" ") : undefined,
  };
}

/** 슬롯에 이미 배치된 선수가 출전 불가 상태일 때 표시할 경고 */
export function getPlacedFighterSlotWarning(
  assignability: Pick<BracketAssignability, "isAssignable" | "disabledReason">,
): string | undefined {
  if (assignability.isAssignable) {
    return undefined;
  }
  return (
    assignability.disabledReason ??
    "출전 불가 상태입니다. 슬롯을 비워 주세요."
  );
}
