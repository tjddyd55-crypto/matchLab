/** 생년월일 등 날짜만 의미 있는 필드 — 로컬 달력일 기준 UTC 자정 스텝으로 정규화 */
export function toUtcDateOnly(date: Date): Date {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
}

/**
 * DB에 UTC 자정으로 저장된 날짜-only 필드를 타임존 무관하게 표시.
 * 서버(UTC)·클라이언트(KST) hydration 불일치(#418)를 막는다.
 */
export function formatUtcDateOnly(
  value: Date | string,
  separator: "." | "-" = ".",
): string {
  const d = typeof value === "string" ? new Date(value) : value;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${separator}${m}${separator}${day}`;
}
