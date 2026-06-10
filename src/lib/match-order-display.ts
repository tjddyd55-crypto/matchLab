/** 경기 순서 표시·정렬 — globalMatchOrder > matchNumber > matchOrder */

export type MatchOrderFields = {
  matchNumber: number | null;
  globalMatchOrder: number | null;
  matchOrder: number;
};

export function getMatchOrderSortKey(match: MatchOrderFields): number {
  if (match.matchNumber != null) return match.matchNumber;
  if (match.globalMatchOrder != null) return match.globalMatchOrder;
  return match.matchOrder;
}

export function compareMatchOrder(
  a: MatchOrderFields,
  b: MatchOrderFields,
): number {
  return getMatchOrderSortKey(a) - getMatchOrderSortKey(b);
}

export function sortMatchesByOrder<T extends MatchOrderFields>(
  matches: T[],
): T[] {
  return [...matches].sort(compareMatchOrder);
}

/** 짧은 라벨: "3경기" */
export function formatMatchOrderShort(match: MatchOrderFields): string {
  if (match.matchNumber != null) return `${match.matchNumber}경기`;
  if (match.globalMatchOrder != null) {
    return `${match.globalMatchOrder + 1}경기`;
  }
  return `${match.matchOrder + 1}경기`;
}

/** 공개·강조 라벨: "제3경기" */
export function buildOrderSwapPatches(
  a: MatchOrderFields & { id: string },
  b: MatchOrderFields & { id: string },
): Array<{
  id: string;
  data: {
    matchNumber?: number;
    globalMatchOrder?: number;
    matchOrder?: number;
  };
}> {
  if (a.matchNumber != null && b.matchNumber != null) {
    return [
      { id: a.id, data: { matchNumber: b.matchNumber } },
      { id: b.id, data: { matchNumber: a.matchNumber } },
    ];
  }
  if (a.globalMatchOrder != null || b.globalMatchOrder != null) {
    const aVal = a.globalMatchOrder ?? a.matchOrder;
    const bVal = b.globalMatchOrder ?? b.matchOrder;
    return [
      { id: a.id, data: { globalMatchOrder: bVal } },
      { id: b.id, data: { globalMatchOrder: aVal } },
    ];
  }
  return [
    { id: a.id, data: { matchOrder: b.matchOrder } },
    { id: b.id, data: { matchOrder: a.matchOrder } },
  ];
}

export function formatMatchOrderFormal(match: MatchOrderFields): string {
  if (match.matchNumber != null) return `제${match.matchNumber}경기`;
  if (match.globalMatchOrder != null) {
    return `제${match.globalMatchOrder + 1}경기`;
  }
  return `제${match.matchOrder + 1}경기`;
}
