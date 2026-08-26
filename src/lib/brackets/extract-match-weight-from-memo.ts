/**
 * Match.organizerMemo 에서 체중 숫자/라벨 추출 (legacy backfill·transition fallback).
 * 첫 번째 kg 패턴만 사용.
 */
const MEMO_WEIGHT_RE = /(\d+(?:\.\d+)?)\s*kg\b/i;

/**
 * @returns e.g. 68 | 42.5 | null
 */
export function extractMatchWeightKgFromMemo(
  memo: string | null | undefined,
): number | null {
  if (memo == null) return null;
  const text = String(memo).trim();
  if (!text) return null;
  const m = text.match(MEMO_WEIGHT_RE);
  if (!m?.[1]) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/**
 * @returns e.g. "68kg" | "42.5kg" | null
 */
export function extractMatchWeightFromMemo(
  memo: string | null | undefined,
): string | null {
  const n = extractMatchWeightKgFromMemo(memo);
  if (n == null) return null;
  return formatMatchWeightKgLabel(n);
}

/**
 * DB Float → PDF/UI 라벨. 60.0 → "60kg", 42.5 → "42.5kg"
 */
export function formatMatchWeightKgLabel(
  kg: number | null | undefined,
): string | null {
  if (kg == null) return null;
  if (!Number.isFinite(kg) || kg <= 0) return null;
  const normalized = Number.isInteger(kg) ? String(kg) : String(kg);
  // trim trailing zeros from float noise: 60.0000001 → keep sensible
  const cleaned = Number(normalized);
  if (!Number.isFinite(cleaned) || cleaned <= 0) return null;
  const text = Number.isInteger(cleaned)
    ? String(cleaned)
    : String(cleaned).replace(/(\.\d*?[1-9])0+$/, "$1").replace(/\.0+$/, "");
  return `${text}kg`;
}

/**
 * 표시용 체중: 정식 필드 우선, 없으면 legacy memo 추출 (transition fallback).
 */
export function resolveMatchWeightLabel(input: {
  matchWeightKg?: number | null;
  organizerMemo?: string | null;
}): string | null {
  const fromField = formatMatchWeightKgLabel(input.matchWeightKg);
  if (fromField) return fromField;
  return extractMatchWeightFromMemo(input.organizerMemo);
}

/** 숫자 SSOT resolve — UI draft/dirty 기준 */
export function resolveMatchWeightKgValue(input: {
  matchWeightKg?: number | null;
  organizerMemo?: string | null;
}): number | null {
  if (input.matchWeightKg != null && Number.isFinite(input.matchWeightKg)) {
    return input.matchWeightKg;
  }
  return extractMatchWeightKgFromMemo(input.organizerMemo);
}

/**
 * input 문자열 → 저장용 number | null (빈 값 null, 잘못된 값 invalid)
 */
export function parseMatchWeightKgInput(
  raw: string | null | undefined,
): { ok: true; value: number | null } | { ok: false; message: string } {
  if (raw == null) return { ok: true, value: null };
  const text = String(raw).trim().replace(/kg$/i, "").trim();
  if (!text) return { ok: true, value: null };
  if (!/^\d+(\.\d+)?$/.test(text)) {
    return { ok: false, message: "체중은 숫자로 입력해 주세요. (예: 68, 42.5)" };
  }
  const n = Number(text);
  if (!Number.isFinite(n) || n <= 0 || n > 500) {
    return { ok: false, message: "체중 값을 확인해 주세요." };
  }
  return { ok: true, value: n };
}

/** input 표시용 — 68 / 42.5 */
export function formatMatchWeightKgInputValue(
  kg: number | null | undefined,
): string {
  if (kg == null || !Number.isFinite(kg)) return "";
  const cleaned = Number(kg);
  if (Number.isInteger(cleaned)) return String(cleaned);
  return String(cleaned)
    .replace(/(\.\d*?[1-9])0+$/, "$1")
    .replace(/\.0+$/, "");
}
