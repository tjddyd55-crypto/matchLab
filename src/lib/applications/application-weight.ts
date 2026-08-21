/**
 * 신청체중 파싱 SSOT.
 * 의미: 이번 대회 출전 신청 체중. 계체(weighInWeightKg)와 구분한다.
 */

export type ApplicationWeightParseResult =
  | { ok: true; kg: number }
  | { ok: false; error: string };

const STRICT_WEIGHT_RE = /^\s*(\d+(?:\.\d+)?)\s*(?:kg)?\s*$/i;

export type OptionalApplicationWeightParseResult =
  | { ok: true; kg: number | null }
  | { ok: false; error: string };

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

/** 1차 신청: 빈칸 허용. 값이 있으면 parseApplicationWeightKg와 동일 검증. */
export function parseOptionalApplicationWeightKg(
  raw: string | number | null | undefined,
): OptionalApplicationWeightParseResult {
  if (raw == null) return { ok: true, kg: null };
  if (typeof raw === "string" && !raw.trim()) return { ok: true, kg: null };
  const parsed = parseApplicationWeightKg(raw);
  if (!parsed.ok) return parsed;
  return { ok: true, kg: parsed.kg };
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
