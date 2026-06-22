/** 경기장 배정·경기장 내 순서 기준 정렬·재번호 */

export type CourtScheduleMatch = {
  matchId: string;
  courtId: string | null;
  courtOrder: number | null;
};

export type CourtSortRef = {
  id: string;
  sortOrder: number;
};

export function buildCourtSortIndex(
  courts: CourtSortRef[],
): Map<string, number> {
  return new Map(
    [...courts]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((c, index) => [c.id, index]),
  );
}

function tieBreakId(match: CourtScheduleMatch & { id?: string }): string {
  return match.matchId ?? match.id ?? "";
}

export function compareCourtScheduleMatches(
  a: CourtScheduleMatch & { id?: string },
  b: CourtScheduleMatch & { id?: string },
  courtSortIndex: Map<string, number>,
): number {
  const ca =
    a.courtId != null ? (courtSortIndex.get(a.courtId) ?? 999) : 9999;
  const cb =
    b.courtId != null ? (courtSortIndex.get(b.courtId) ?? 999) : 9999;
  if (ca !== cb) return ca - cb;

  const oa = a.courtOrder ?? Number.MAX_SAFE_INTEGER;
  const ob = b.courtOrder ?? Number.MAX_SAFE_INTEGER;
  if (oa !== ob) return oa - ob;

  return tieBreakId(a).localeCompare(tieBreakId(b));
}

export function sortMatchesByCourtSchedule<
  T extends CourtScheduleMatch & { id?: string },
>(matches: T[], courts: CourtSortRef[]): T[] {
  const courtSortIndex = buildCourtSortIndex(courts);
  return [...matches].sort((a, b) =>
    compareCourtScheduleMatches(a, b, courtSortIndex),
  );
}

function sortMatchIdsByCourtOrder(
  matchIds: string[],
  allMatches: CourtScheduleMatch[],
): string[] {
  return [...matchIds].sort((idA, idB) => {
    const ma = allMatches.find((m) => m.matchId === idA);
    const mb = allMatches.find((m) => m.matchId === idB);
    const oa = ma?.courtOrder ?? Number.MAX_SAFE_INTEGER;
    const ob = mb?.courtOrder ?? Number.MAX_SAFE_INTEGER;
    if (oa !== ob) return oa - ob;
    return idA.localeCompare(idB);
  });
}

/** 경기장별 courtOrder를 1부터 연속 번호로 재부여 */
export function renumberAllCourtOrders(
  matches: CourtScheduleMatch[],
): Array<{
  matchId: string;
  courtId: string | null;
  courtOrder: number | null;
}> {
  const byCourt = new Map<string, CourtScheduleMatch[]>();
  const unassigned: CourtScheduleMatch[] = [];

  for (const m of matches) {
    if (!m.courtId) {
      unassigned.push(m);
      continue;
    }
    const list = byCourt.get(m.courtId) ?? [];
    list.push(m);
    byCourt.set(m.courtId, list);
  }

  const updates: Array<{
    matchId: string;
    courtId: string | null;
    courtOrder: number | null;
  }> = [];

  for (const [courtId, courtMatches] of byCourt) {
    const sorted = [...courtMatches].sort((a, b) => {
      const oa = a.courtOrder ?? Number.MAX_SAFE_INTEGER;
      const ob = b.courtOrder ?? Number.MAX_SAFE_INTEGER;
      if (oa !== ob) return oa - ob;
      return a.matchId.localeCompare(b.matchId);
    });
    sorted.forEach((m, idx) => {
      updates.push({
        matchId: m.matchId,
        courtId,
        courtOrder: idx + 1,
      });
    });
  }

  for (const m of unassigned) {
    updates.push({
      matchId: m.matchId,
      courtId: null,
      courtOrder: null,
    });
  }

  return updates;
}

function clampPosition(position: number, maxInclusive: number): number {
  if (!Number.isFinite(position)) return maxInclusive;
  if (position < 1) return 1;
  if (position > maxInclusive) return maxInclusive;
  return position;
}

/**
 * 단일 경기 이동 시 영향받는 경기장의 순서를 재계산한다.
 * - 같은 경기장: 제거 → 삽입 → 1부터 재번호
 * - 다른 경기장: 양쪽 경기장 모두 재번호
 */
export function computeCourtOrderUpdates(params: {
  allMatches: CourtScheduleMatch[];
  movingMatchId: string;
  targetCourtId: string;
  targetPosition?: number | null;
}): Array<{
  matchId: string;
  courtId: string | null;
  courtOrder: number | null;
}> {
  const { allMatches, movingMatchId, targetCourtId, targetPosition } = params;
  const moving = allMatches.find((m) => m.matchId === movingMatchId);
  if (!moving) {
    throw new Error("경기를 찾을 수 없습니다.");
  }

  const oldCourtId = moving.courtId;
  const listsByCourt = new Map<string, string[]>();

  for (const m of allMatches) {
    if (m.matchId === movingMatchId || !m.courtId) continue;
    const list = listsByCourt.get(m.courtId) ?? [];
    list.push(m.matchId);
    listsByCourt.set(m.courtId, list);
  }

  for (const [courtId, ids] of listsByCourt) {
    listsByCourt.set(
      courtId,
      sortMatchIdsByCourtOrder(ids, allMatches),
    );
  }

  const targetList = listsByCourt.get(targetCourtId) ?? [];
  const insertAt = clampPosition(
    targetPosition ?? targetList.length + 1,
    targetList.length + 1,
  );
  targetList.splice(insertAt - 1, 0, movingMatchId);
  listsByCourt.set(targetCourtId, targetList);

  const courtsToRenumber = new Set<string>([targetCourtId]);
  if (oldCourtId && oldCourtId !== targetCourtId) {
    courtsToRenumber.add(oldCourtId);
  }

  const updates: Array<{
    matchId: string;
    courtId: string | null;
    courtOrder: number | null;
  }> = [];

  for (const courtId of courtsToRenumber) {
    const list = listsByCourt.get(courtId) ?? [];
    list.forEach((matchId, idx) => {
      updates.push({
        matchId,
        courtId,
        courtOrder: idx + 1,
      });
    });
  }

  return updates;
}
