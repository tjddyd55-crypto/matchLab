import type {
  CheckInStatus,
  WeighInFailureResolution,
  WeighInStatus,
} from "@/generated/prisma";

export type FieldEligibilityInput = {
  checkInStatus: CheckInStatus;
  weighInStatus: WeighInStatus;
  weighInFailureResolution?: WeighInFailureResolution;
};

export type FieldEligibility = {
  isEligibleForBracket: boolean;
  eligibilityLabel: string;
  eligibilityReason: string;
};

const CHECK_IN_LABEL: Record<CheckInStatus, string> = {
  pending: "현장 미확인",
  checked_in: "현장 확인",
  no_show: "미출석",
  withdrawn: "철회",
  disqualified: "실격",
};

const WEIGH_IN_LABEL: Record<WeighInStatus, string> = {
  pending: "계체 전",
  pass: "계체 통과",
  fail: "계체 실패",
  manual_pass: "수동 승인",
  manual_fail: "수동 실패",
};

function isWeighInPassed(status: WeighInStatus): boolean {
  return status === "pass" || status === "manual_pass";
}

/** 출전 확정: 현장 확인 + (계체 통과 또는 수동 승인) */
export function computeFieldEligibility(
  input: FieldEligibilityInput,
): FieldEligibility {
  const { checkInStatus, weighInStatus } = input;

  if (checkInStatus === "no_show") {
    return {
      isEligibleForBracket: false,
      eligibilityLabel: "미출석",
      eligibilityReason: "현장에 도착하지 않은 선수입니다.",
    };
  }

  if (checkInStatus === "withdrawn") {
    return {
      isEligibleForBracket: false,
      eligibilityLabel: "철회",
      eligibilityReason: "출전을 철회한 선수입니다.",
    };
  }

  if (checkInStatus === "disqualified") {
    return {
      isEligibleForBracket: false,
      eligibilityLabel: "실격",
      eligibilityReason: "실격 처리된 선수입니다.",
    };
  }

  if (checkInStatus === "pending") {
    return {
      isEligibleForBracket: false,
      eligibilityLabel: "현장 미확인",
      eligibilityReason: "현장 확인(체크인)이 완료되지 않았습니다.",
    };
  }

  if (weighInStatus === "fail" || weighInStatus === "manual_fail") {
    if (input.weighInFailureResolution === "proceed_with_handicap") {
      return {
        isEligibleForBracket: true,
        eligibilityLabel: "계체 실패 · 경기진행",
        eligibilityReason: "핸디캡 적용 후 경기 진행",
      };
    }
    if (input.weighInFailureResolution === "cancel_match") {
      return {
        isEligibleForBracket: false,
        eligibilityLabel: "계체 실패 · 경기취소",
        eligibilityReason: "계체 실패 후 경기가 취소되었습니다.",
      };
    }
    return {
      isEligibleForBracket: false,
      eligibilityLabel: "계체 실패",
      eligibilityReason:
        weighInStatus === "manual_fail"
          ? "주최측이 계체 실패(수동)로 처리했습니다."
          : "신청 체급 기준을 충족하지 못했습니다.",
    };
  }

  if (weighInStatus === "pending") {
    return {
      isEligibleForBracket: false,
      eligibilityLabel: "계체 전",
      eligibilityReason: "계체가 완료되지 않았습니다.",
    };
  }

  if (weighInStatus === "manual_pass") {
    return {
      isEligibleForBracket: true,
      eligibilityLabel: "수동 승인",
      eligibilityReason: "현장 확인 완료 · 주최자 수동 승인",
    };
  }

  return {
    isEligibleForBracket: true,
    eligibilityLabel: "출전 확정",
    eligibilityReason: "현장 확인 및 계체 통과",
  };
}

export function getCheckInStatusLabel(status: CheckInStatus): string {
  return CHECK_IN_LABEL[status];
}

export function getWeighInStatusLabel(status: WeighInStatus): string {
  return WEIGH_IN_LABEL[status];
}

export function canAutoEvaluateWeighIn(status: WeighInStatus): boolean {
  return status === "pending" || status === "pass" || status === "fail";
}

export { isWeighInPassed };
