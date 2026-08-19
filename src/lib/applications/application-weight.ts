/**
 * 신청체중 파싱 SSOT.
 * 의미: 이번 대회 출전 신청 체중. 계체(weighInWeightKg)와 구분한다.
 */

export type ApplicationWeightParseResult =
  | { ok: true; kg: number }
  | { ok: false; error: string };

const STRICT_WEIGHT_RE = /^\s*(\d+(?:\.\d+)?)\s*(?:kg)?\s*$/i;

export function parseApplicationWeightKg(
  raw: string | number | null | undefined,
): ApplicationWeightParseResult {
  if (typeof raw === "number") {
    return validateKg(raw);
  }
  const text = String(raw ?? "").trim();
  if (!text) {
    return { ok: false, error: "신청체중을 입력해 주세요." };
  }
  if (!STRICT_WEIGHT_RE.test(text)) {
    return {
      ok: false,
      error: "신청체중은 숫자만 입력해 주세요. 예: 62.5 또는 62.5kg",
    };
  }
  const kg = Number.parseFloat(text.replace(/kg/i, "").trim());
  return validateKg(kg);
}

function validateKg(kg: number): ApplicationWeightParseResult {
  if (!Number.isFinite(kg) || kg <= 0 || kg > 300) {
    return { ok: false, error: "신청체중이 올바른 숫자가 아닙니다." };
  }
  return { ok: true, kg };
}

export function formatApplicationWeightKg(kg: number): string {
  return `${kg}kg`;
}
