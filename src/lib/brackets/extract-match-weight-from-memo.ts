/**
 * Match.organizerMemo 에서 인쇄용 체중 라벨만 추출.
 * 메모 전체는 PDF에 노출하지 않는다. 첫 번째 kg 패턴만 사용.
 */
const MEMO_WEIGHT_RE = /(\d+(?:\.\d+)?)\s*kg\b/i;

/**
 * @returns e.g. "68kg" | "42.5kg" | null
 */
export function extractMatchWeightFromMemo(
  memo: string | null | undefined,
): string | null {
  if (memo == null) return null;
  const text = String(memo).trim();
  if (!text) return null;
  const m = text.match(MEMO_WEIGHT_RE);
  if (!m?.[1]) return null;
  return `${m[1]}kg`;
}
