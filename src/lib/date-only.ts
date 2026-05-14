/** 생년월일 등 날짜만 의미 있는 필드 — 로컬 달력일 기준 UTC 자정 스텝으로 정규화 */
export function toUtcDateOnly(date: Date): Date {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
}
