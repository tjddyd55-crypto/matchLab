/** 비교·저장 정규화용 — 표시용 포맷과 분리 */
export function normalizePhoneDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}
