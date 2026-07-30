/**
 * Interval overlap — exclusive endpoints (끝=시작 접점 허용).
 */
export function intervalsOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart.getTime() < bEnd.getTime() && aEnd.getTime() > bStart.getTime();
}

export type OverlapKind = "staff" | "member";

export function findFirstOverlap<T extends { startsAt: Date; endsAt: Date }>(
  candidateStart: Date,
  candidateEnd: Date,
  existing: readonly T[],
): T | null {
  for (const row of existing) {
    if (intervalsOverlap(candidateStart, candidateEnd, row.startsAt, row.endsAt)) {
      return row;
    }
  }
  return null;
}
