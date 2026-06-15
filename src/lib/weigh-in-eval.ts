import { parseSingleWeightEntry } from "@/lib/division-template/division-template-parse";

export type WeighInEvaluation = {
  passed: boolean;
  reason: string;
  /** 체급 문자열을 해석하지 못한 경우 */
  indeterminate: boolean;
};

/**
 * 신청 경기구분의 weightClass 문자열과 실제 몸무게(kg)로 계체 통과 여부를 판정한다.
 * `-55kg` → 55kg 이하, `+70kg` → 70kg 이상.
 */
export function evaluateWeighInWeight(
  actualWeightKg: number,
  weightClassLabel: string | null | undefined,
): WeighInEvaluation {
  if (!Number.isFinite(actualWeightKg) || actualWeightKg <= 0) {
    return {
      passed: false,
      reason: "유효한 몸무게를 입력해 주세요.",
      indeterminate: true,
    };
  }

  const label = weightClassLabel?.trim();
  if (!label) {
    return {
      passed: false,
      reason: "신청 경기구분에 체급 정보가 없어 자동 판정할 수 없습니다.",
      indeterminate: true,
    };
  }

  const parsed = parseSingleWeightEntry(label);
  if (!parsed.weightLimitKg || !parsed.limitType) {
    return {
      passed: false,
      reason: `체급「${label}」을(를) 자동 해석하지 못했습니다. 수동 승인/실패를 사용해 주세요.`,
      indeterminate: true,
    };
  }

  const limit = parsed.weightLimitKg;

  if (parsed.limitType === "over") {
    if (actualWeightKg >= limit) {
      return {
        passed: true,
        reason: `${limit}kg 이상 기준 충족 (${actualWeightKg}kg)`,
        indeterminate: false,
      };
    }
    return {
      passed: false,
      reason: `${limit}kg 미만 (${actualWeightKg}kg)`,
      indeterminate: false,
    };
  }

  if (actualWeightKg <= limit) {
    return {
      passed: true,
      reason: `${limit}kg 이하 기준 충족 (${actualWeightKg}kg)`,
      indeterminate: false,
    };
  }

  return {
    passed: false,
    reason: `${limit}kg 초과 (${actualWeightKg}kg)`,
    indeterminate: false,
  };
}
