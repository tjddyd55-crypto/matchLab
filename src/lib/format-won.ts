/** 원화 표시 — 숫자만 저장, 화면은 천 단위 구분 */

export function formatWon(amount: number): string {
  if (!Number.isFinite(amount)) return "0원";
  return `${Math.trunc(amount).toLocaleString("ko-KR")}원`;
}

/** 입력 문자열에서 숫자만 추출 (음수·소수 차단) */
export function parseWonInput(raw: string): number | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  const n = Number(digits);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.trunc(n);
}
