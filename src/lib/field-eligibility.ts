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

/** UI 표시용 — manual_pass는 레거시 데이터 호환, 사용자에게 수동 승인으로 노출하지 않음 */
const WEIGH_IN_LABEL: Record<WeighInStatus, string> = {
  pending: "계체 대기",
  pass: "계체 통과",
  fail: "계체 실패",
  manual_pass: "계체 통과",
  manual_fail: "계체 실패",
};

function isWeighInPassed(status: WeighInStatus): boolean {
  return status === "pass" || status === "manual_pass";
}

/**
 * 출전 확정 SSOT.
 * - 미출석/철회/실격 → 불가
 * - 계체 통과(또는 레거시 manual_pass) → 가능
 * - 계체 실패 + 핸디캡 경기 진행 → 가능
 * - 계체 실패 + 경기 취소 / 미결정 → 불가
 * - 현장 확인(check-in pending)은 더 이상 선행 조건이 아님
 */
export function computeFieldEligibility(
  input: FieldEligibilityInput,
): FieldEligibility {
  const { checkInStatus, weighInStatus } = input;

  if (checkInStatus === "no_show") {
    return {
      isEligibleForBracket: false,
      eligibilityLabel: "미출석",
      eligibilityReason: "미출석으로 처리된 선수입니다.",
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

  if (weighInStatus === "fail" || weighInStatus === "manual_fail") {
    if (input.weighInFailureResolution === "proceed_with_handicap") {
      return {
        isEligibleForBracket: true,
        eligibilityLabel: "핸디캡 경기",
        eligibilityReason: "계체 실패 후 핸디캡 적용 경기 진행",
      };
    }
    if (input.weighInFailureResolution === "cancel_match") {
      return {
        isEligibleForBracket: false,
        eligibilityLabel: "경기취소",
        eligibilityReason: "계체 실패 후 경기가 취소되었습니다.",
      };
    }
    return {
      isEligibleForBracket: false,
      eligibilityLabel: "계체 실패",
      eligibilityReason: "신청 체급 기준을 충족하지 못했습니다.",
    };
  }

  if (weighInStatus === "pending") {
    return {
      isEligibleForBracket: false,
      eligibilityLabel: "계체 대기",
      eligibilityReason: "계체가 완료되지 않았습니다.",
    };
  }

  // pass 또는 레거시 manual_pass
  return {
    isEligibleForBracket: true,
    eligibilityLabel: "출전 확정",
    eligibilityReason: "계체 통과",
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
