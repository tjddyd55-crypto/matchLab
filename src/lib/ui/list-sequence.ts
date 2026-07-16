/** 목록 표시 순번 — 현재 필터·정렬 결과 기준 (DB id 아님). */
export function displaySequenceNumber(index: number, offset = 0): number {
  return offset + index + 1;
}

/** pagination: (page - 1) * pageSize + index + 1 */
export function paginatedSequenceNumber(
  index: number,
  page: number,
  pageSize: number,
): number {
  const safePage = Math.max(1, page);
  const safeSize = Math.max(1, pageSize);
  return (safePage - 1) * safeSize + index + 1;
}
