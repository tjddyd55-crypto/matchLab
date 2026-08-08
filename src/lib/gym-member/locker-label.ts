import "server-only";

/** 사물함 번호 정규화 (trim + 연속 공백 축약). "23번"/"23"은 별개로 취급. */
export function normalizeLockerLabel(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/**
 * 기간 겹침: [startedAt, endsAt|∞) ∩ [newStart, newEnd|∞) 비어 있지 않음.
 * endedAt이 있는 rental은 종료로 간주해 overlap 대상에서 제외한다.
 */
export function lockerRangesOverlap(a: {
  startedAt: Date;
  endsAt: Date | null;
}, b: {
  startedAt: Date;
  endsAt: Date | null;
}): boolean {
  const aStart = a.startedAt.getTime();
  const aEnd = a.endsAt ? a.endsAt.getTime() : Number.POSITIVE_INFINITY;
  const bStart = b.startedAt.getTime();
  const bEnd = b.endsAt ? b.endsAt.getTime() : Number.POSITIVE_INFINITY;
  return aStart <= bEnd && bStart <= aEnd;
}
