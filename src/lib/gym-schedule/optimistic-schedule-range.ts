/**
 * 보드 drag/resize optimistic SSOT.
 * 서버 검증을 대체하지 않으며, UI 위치만 선반영한다.
 */
import type { BoardTimePatch } from "@/lib/gym-schedule/board-geometry";
import type { GymCalendarItem } from "@/lib/gym-schedule/calendar-item";

export type OptimisticScheduleRange = BoardTimePatch & {
  /** 서버 저장이 아직 끝나지 않음. 카드에 저장 중 표시를 띄운다. */
  pending: boolean;
  originalDateKey: string;
  originalStartsAtMs: number;
  originalEndsAtMs: number;
};

export function applyOptimisticScheduleRange(
  item: GymCalendarItem,
  patch: BoardTimePatch,
): OptimisticScheduleRange {
  return {
    ...patch,
    pending: true,
    originalDateKey: item.dateKey,
    originalStartsAtMs: item.startsAt.getTime(),
    originalEndsAtMs: item.endsAt.getTime(),
  };
}

/**
 * 서버 저장 성공. 아직 새 server props 가 오기 전이므로 값은 유지하되
 * `pending` 만 내려 다음 갱신에서 서버에 자리를 넘길 수 있게 한다.
 */
export function settleOptimisticScheduleRange(
  map: Record<string, OptimisticScheduleRange>,
  id: string,
): Record<string, OptimisticScheduleRange> {
  const entry = map[id];
  if (!entry || !entry.pending) return map;
  return { ...map, [id]: { ...entry, pending: false } };
}

export function serverMatchesOptimistic(
  item: GymCalendarItem,
  entry: OptimisticScheduleRange,
): boolean {
  return (
    item.dateKey === entry.dateKey &&
    item.startsAt.getTime() === entry.startsAt.getTime() &&
    item.endsAt.getTime() === entry.endsAt.getTime()
  );
}

export function commitOptimisticScheduleRange(
  map: Record<string, OptimisticScheduleRange>,
  id: string,
): Record<string, OptimisticScheduleRange> {
  if (!(id in map)) return map;
  const next = { ...map };
  delete next[id];
  return next;
}

export function rollbackOptimisticScheduleRange(
  map: Record<string, OptimisticScheduleRange>,
  id: string,
): Record<string, OptimisticScheduleRange> {
  return commitOptimisticScheduleRange(map, id);
}

/**
 * 새 server props 가 도착했을 때 optimistic 항목을 정리한다.
 *
 * 제거 조건
 * - 서버 값이 optimistic 과 일치 → 목적 달성
 * - 저장이 이미 끝난 항목(`pending === false`) → 이후로는 서버가 SSOT
 * - 서버 목록에서 사라진 항목 → 붙잡고 있을 이유가 없음
 *
 * 저장 진행 중(`pending`)인 항목만 남겨 원위치 깜빡임을 막는다.
 */
export function reconcileOptimisticScheduleRanges(
  map: Record<string, OptimisticScheduleRange>,
  serverItems: GymCalendarItem[],
): Record<string, OptimisticScheduleRange> {
  let changed = false;
  const next = { ...map };
  for (const [id, entry] of Object.entries(map)) {
    const server = serverItems.find((item) => item.id === id);
    const resolved =
      !server || !entry.pending || serverMatchesOptimistic(server, entry);
    if (resolved) {
      delete next[id];
      changed = true;
    }
  }
  return changed ? next : map;
}
