/**
 * 전적·학년 기반 자동매칭 엔진 V2 (+ 체중 근접 soft priority)
 *
 * 기존 auto-match.ts(성별·체급·체육관 필터)를 확장.
 * 이 모듈은 순수 함수 — DB/IO 없음.
 *
 * Hard constraints:
 * 1. 무전(totalBouts=0)은 무전끼리만
 * 2. |전적차| >= 2 금지
 * 3. 초등부 band 크로스 금지
 * 4. 동일 체육관 금지(옵션)
 *
 * Soft priority (동일 hard 통과 시):
 * 1. 가능한 Match 수 최대화
 * 2. Σ|신청체중 차| 최소화
 * 3. 학년 차이 최소화
 * 4. deterministic tie-break (applicationId)
 */

import { isSameGym } from "@/lib/brackets/gym-match-key";
import { maxWeightMatching } from "@/lib/brackets/max-weight-matching";
import {
  getElementaryMatchBand,
  SCHOOL_LEVEL,
  type ElementaryMatchBand,
} from "@/lib/fighter/record";

export type RecordMatchCandidate = {
  applicationId: string;
  fighterId: string;
  divisionId: string;
  gymId: string | null;
  gymName: string;
  fighterName: string;
  appliedAt: Date;
  isEligibleForBracket: boolean;
  isAssignableForBracket: boolean;
  totalBouts: number | null;
  schoolLevel: string | null;
  schoolGrade: number | null;
  /** 신청체중(kg) — fighterSnapshot.applicationWeightKg SSOT. 계체값 사용 금지. */
  applicationWeightKg: number | null;
};

export type RecordUnmatchedReason =
  | "odd_count"
  | "no_opponent_in_division"
  | "not_field_eligible"
  | "already_placed"
  | "missing_division"
  | "same_gym_only_remaining"
  | "zero_vs_nonzero"
  | "record_diff_too_large"
  | "elementary_band_mismatch"
  | "unknown_record"
  | "court_capacity_full";

export type RecordMatchPair = {
  red: RecordMatchCandidate;
  blue: RecordMatchCandidate;
  sameGymWarning: boolean;
  matchReason: string;
  redWeightKg: number | null;
  blueWeightKg: number | null;
  /** null = 한쪽 이상 체중 없음 */
  weightDiffKg: number | null;
};

export type RecordUnmatchedCandidate = RecordMatchCandidate & {
  reason: RecordUnmatchedReason;
  reasonLabel: string;
};

export type RecordDivisionPairingResult = {
  divisionId: string;
  pairs: RecordMatchPair[];
  unmatched: RecordUnmatchedCandidate[];
  sameGymPairCount: number;
};

const MISSING_WEIGHT_MILLI = 1_000_000_000;
/** bitmask DP 상한 — 이보다 크면 Edmonds max-weight matching */
const DP_N_MAX = 16;
/** blossom soft-cost 인코딩용 체중차 상한(milli) — Number overflow 방지 */
const BLOSSOM_WEIGHT_MILLI_CAP = 10_000_000;

function isSameGymCandidate(
  a: RecordMatchCandidate,
  b: RecordMatchCandidate,
): boolean {
  return isSameGym(a, b);
}

function elementaryBandOf(c: RecordMatchCandidate): ElementaryMatchBand | null {
  if (c.schoolLevel !== SCHOOL_LEVEL.ELEMENTARY) return null;
  if (c.schoolGrade == null) return null;
  return getElementaryMatchBand(c.schoolGrade);
}

function isElementaryBandCompatible(
  a: RecordMatchCandidate,
  b: RecordMatchCandidate,
): boolean {
  const bandA = elementaryBandOf(a);
  const bandB = elementaryBandOf(b);
  if (bandA === null && bandB === null) return true;
  if (bandA !== bandB) return false;
  return true;
}

function sortCandidates(
  candidates: RecordMatchCandidate[],
): RecordMatchCandidate[] {
  return [...candidates].sort((a, b) => {
    const bA = a.totalBouts ?? -1;
    const bB = b.totalBouts ?? -1;
    if (bA !== bB) return bA - bB;
    const tA = a.appliedAt.getTime();
    const tB = b.appliedAt.getTime();
    if (tA !== tB) return tA - tB;
    return a.applicationId.localeCompare(b.applicationId);
  });
}

function gradeDiffScore(
  a: RecordMatchCandidate,
  b: RecordMatchCandidate,
): number {
  if (a.schoolLevel !== b.schoolLevel) return 999;
  if (a.schoolGrade == null || b.schoolGrade == null) return 0;
  return Math.abs(a.schoolGrade - b.schoolGrade);
}

/** 신청체중 차(milli-kg). 한쪽 없으면 큰 penalty — pair는 허용하되 soft 최후순위. */
export function weightDiffMilli(
  a: Pick<RecordMatchCandidate, "applicationWeightKg">,
  b: Pick<RecordMatchCandidate, "applicationWeightKg">,
): number {
  const wa = a.applicationWeightKg;
  const wb = b.applicationWeightKg;
  if (
    wa == null ||
    wb == null ||
    !Number.isFinite(wa) ||
    !Number.isFinite(wb) ||
    wa <= 0 ||
    wb <= 0
  ) {
    return MISSING_WEIGHT_MILLI;
  }
  return Math.round(Math.abs(wa - wb) * 1000);
}

export function weightDiffKgOrNull(
  a: Pick<RecordMatchCandidate, "applicationWeightKg">,
  b: Pick<RecordMatchCandidate, "applicationWeightKg">,
): number | null {
  const milli = weightDiffMilli(a, b);
  if (milli >= MISSING_WEIGHT_MILLI) return null;
  return milli / 1000;
}

function buildMatchReason(
  a: RecordMatchCandidate,
  b: RecordMatchCandidate,
): string {
  const parts: string[] = [];
  if (a.totalBouts != null && a.totalBouts === b.totalBouts) {
    parts.push(`동일 전적(${a.totalBouts}전)`);
  } else if (a.totalBouts != null && b.totalBouts != null) {
    parts.push(`전적 차이 1전`);
  }
  const wDiff = weightDiffKgOrNull(a, b);
  if (wDiff != null) {
    parts.push(`체중차 ${formatWeightDiffLabel(wDiff)}`);
  }
  if (a.schoolLevel === SCHOOL_LEVEL.ELEMENTARY) {
    const band = elementaryBandOf(a);
    parts.push(band === "LOW" ? "초1~3 그룹" : "초4~6 그룹");
    if (a.schoolGrade === b.schoolGrade) parts.push("같은 학년");
  }
  return parts.join(", ") || "조건 충족";
}

function formatWeightDiffLabel(diffKg: number): string {
  const rounded = Math.round(diffKg * 1000) / 1000;
  return `${rounded}kg`;
}

function orderPairCorners(
  a: RecordMatchCandidate,
  b: RecordMatchCandidate,
): { red: RecordMatchCandidate; blue: RecordMatchCandidate } {
  const byTime = a.appliedAt.getTime() - b.appliedAt.getTime();
  if (byTime < 0) return { red: a, blue: b };
  if (byTime > 0) return { red: b, blue: a };
  if (a.applicationId.localeCompare(b.applicationId) <= 0) {
    return { red: a, blue: b };
  }
  return { red: b, blue: a };
}

function toPair(
  a: RecordMatchCandidate,
  b: RecordMatchCandidate,
): RecordMatchPair {
  const { red, blue } = orderPairCorners(a, b);
  const sameGym = isSameGymCandidate(red, blue);
  return {
    red,
    blue,
    sameGymWarning: sameGym,
    matchReason: buildMatchReason(red, blue),
    redWeightKg: red.applicationWeightKg,
    blueWeightKg: blue.applicationWeightKg,
    weightDiffKg: weightDiffKgOrNull(red, blue),
  };
}

export type RecordPairOptions = {
  forbidSameGym?: boolean;
};

/**
 * division 내 전적·학년·체중 근접 페어링.
 */
export function pairWithRecordAndGrade(
  candidates: RecordMatchCandidate[],
  options: RecordPairOptions = {},
): RecordDivisionPairingResult {
  const forbidSameGym = options.forbidSameGym !== false;

  if (candidates.length === 0) {
    return { divisionId: "", pairs: [], unmatched: [], sameGymPairCount: 0 };
  }

  const divisionId = candidates[0]!.divisionId;
  const pairs: RecordMatchPair[] = [];
  const unmatched: RecordUnmatchedCandidate[] = [];
  let sameGymPairCount = 0;

  const eligible: RecordMatchCandidate[] = [];
  for (const c of candidates) {
    if (!c.isAssignableForBracket) {
      unmatched.push({
        ...c,
        reason: "not_field_eligible",
        reasonLabel: "출전 조건 미충족",
      });
      continue;
    }
    eligible.push(c);
  }

  const knownPool: RecordMatchCandidate[] = [];
  for (const c of eligible) {
    if (c.totalBouts == null) {
      unmatched.push({
        ...c,
        reason: "unknown_record",
        reasonLabel: "전적 정보 없음",
      });
      continue;
    }
    knownPool.push(c);
  }

  const zeroPool = knownPool.filter((c) => c.totalBouts === 0);
  const nonZeroPool = knownPool.filter((c) => (c.totalBouts ?? 0) > 0);

  const pairedZero = pairWithinPool(zeroPool, forbidSameGym);
  pairs.push(...pairedZero.pairs);
  unmatched.push(
    ...pairedZero.remaining.map((c) => ({
      ...c,
      reason: "zero_vs_nonzero" as RecordUnmatchedReason,
      reasonLabel: "무전 — 무전 상대 없음",
    })),
  );
  sameGymPairCount += pairedZero.sameGymCount;

  const sortedNonZero = sortCandidates(nonZeroPool);
  const byBouts = groupByTotalBouts(sortedNonZero);
  let leftover: RecordMatchCandidate[] = [];

  for (const [, group] of byBouts) {
    const result = pairWithinPool(group, forbidSameGym);
    pairs.push(...result.pairs);
    sameGymPairCount += result.sameGymCount;
    leftover.push(...result.remaining);
  }

  leftover = sortCandidates(leftover);
  const leftoverResult = pairLeftoverByOneDiff(leftover, forbidSameGym);
  pairs.push(...leftoverResult.pairs);
  sameGymPairCount += leftoverResult.sameGymCount;

  for (const c of leftoverResult.remaining) {
    unmatched.push({
      ...c,
      reason: "record_diff_too_large",
      reasonLabel: "전적 차이 허용 범위 초과",
    });
  }

  return { divisionId, pairs, unmatched, sameGymPairCount };
}

function groupByTotalBouts(
  sorted: RecordMatchCandidate[],
): Map<number, RecordMatchCandidate[]> {
  const map = new Map<number, RecordMatchCandidate[]>();
  for (const c of sorted) {
    const key = c.totalBouts!;
    const arr = map.get(key) ?? [];
    arr.push(c);
    map.set(key, arr);
  }
  return map;
}

type PoolPairResult = {
  pairs: RecordMatchPair[];
  remaining: RecordMatchCandidate[];
  sameGymCount: number;
};

type EdgeCost = {
  weightMilli: number;
  grade: number;
  record: number;
  tie: string;
};

function edgeCost(a: RecordMatchCandidate, b: RecordMatchCandidate): EdgeCost {
  const ids = [a.applicationId, b.applicationId].sort();
  return {
    weightMilli: weightDiffMilli(a, b),
    grade: gradeDiffScore(a, b),
    record: Math.abs((a.totalBouts ?? 0) - (b.totalBouts ?? 0)),
    tie: `${ids[0]}|${ids[1]}`,
  };
}

type Score = {
  pairCount: number;
  weightMilli: number;
  gradeSum: number;
  recordSum: number;
  tie: string;
};

function emptyScore(): Score {
  return {
    pairCount: 0,
    weightMilli: 0,
    gradeSum: 0,
    recordSum: 0,
    tie: "",
  };
}

function isBetterScore(a: Score, b: Score | null): boolean {
  if (!b) return true;
  if (a.pairCount !== b.pairCount) return a.pairCount > b.pairCount;
  if (a.weightMilli !== b.weightMilli) return a.weightMilli < b.weightMilli;
  if (a.gradeSum !== b.gradeSum) return a.gradeSum < b.gradeSum;
  if (a.recordSum !== b.recordSum) return a.recordSum < b.recordSum;
  return a.tie < b.tie;
}

function addEdgeToScore(base: Score, cost: EdgeCost): Score {
  return {
    pairCount: base.pairCount + 1,
    weightMilli: base.weightMilli + cost.weightMilli,
    gradeSum: base.gradeSum + cost.grade,
    recordSum: base.recordSum + cost.record,
    tie: base.tie ? `${base.tie};${cost.tie}` : cost.tie,
  };
}

function hardEdgeOk(
  a: RecordMatchCandidate,
  b: RecordMatchCandidate,
  forbidSameGym: boolean,
): boolean {
  if (!isElementaryBandCompatible(a, b)) return false;
  if (forbidSameGym && isSameGymCandidate(a, b)) return false;
  return true;
}

/**
 * 최대 cardinality 우선 → 동일 시 Σ체중차 최소화.
 * n ≤ DP_N_MAX: exact bitmask DP (검증됨).
 * n > DP_N_MAX: Edmonds blossom max-weight matching (maxCardinality).
 */
function optimalPairPool(
  pool: RecordMatchCandidate[],
  forbidSameGym: boolean,
  extraEdgeOk?: (a: RecordMatchCandidate, b: RecordMatchCandidate) => boolean,
): PoolPairResult {
  if (pool.length < 2) {
    return { pairs: [], remaining: [...pool], sameGymCount: 0 };
  }

  const canEdge = (a: RecordMatchCandidate, b: RecordMatchCandidate) => {
    if (!hardEdgeOk(a, b, forbidSameGym)) return false;
    if (extraEdgeOk && !extraEdgeOk(a, b)) return false;
    return true;
  };

  if (pool.length <= DP_N_MAX) {
    return optimalPairPoolExact(pool, canEdge);
  }
  return optimalPairPoolBlossom(pool, canEdge);
}

function optimalPairPoolExact(
  pool: RecordMatchCandidate[],
  canEdge: (a: RecordMatchCandidate, b: RecordMatchCandidate) => boolean,
): PoolPairResult {
  const n = pool.length;
  const full = (1 << n) - 1;
  const bestScore: Array<Score | null> = new Array(full + 1).fill(null);
  const bestChoice: Array<{ j: number } | { unmatched: true } | null> =
    new Array(full + 1).fill(null);

  bestScore[0] = emptyScore();

  for (let mask = 1; mask <= full; mask++) {
    let i = -1;
    for (let b = 0; b < n; b++) {
      if (mask & (1 << b)) {
        i = b;
        break;
      }
    }
    if (i < 0) continue;

    const withoutI = mask ^ (1 << i);
    const leaveScore = bestScore[withoutI];
    if (leaveScore && isBetterScore(leaveScore, bestScore[mask])) {
      bestScore[mask] = leaveScore;
      bestChoice[mask] = { unmatched: true };
    }

    for (let j = i + 1; j < n; j++) {
      if (!(mask & (1 << j))) continue;
      if (!canEdge(pool[i]!, pool[j]!)) continue;
      const rest = withoutI ^ (1 << j);
      const restScore = bestScore[rest];
      if (!restScore) continue;
      const next = addEdgeToScore(restScore, edgeCost(pool[i]!, pool[j]!));
      if (isBetterScore(next, bestScore[mask])) {
        bestScore[mask] = next;
        bestChoice[mask] = { j };
      }
    }
  }

  const pairs: RecordMatchPair[] = [];
  const used = new Set<number>();
  let mask = full;
  while (mask > 0) {
    let i = -1;
    for (let b = 0; b < n; b++) {
      if (mask & (1 << b)) {
        i = b;
        break;
      }
    }
    if (i < 0) break;
    const choice = bestChoice[mask];
    if (!choice || "unmatched" in choice) {
      mask ^= 1 << i;
      continue;
    }
    const j = choice.j;
    pairs.push(toPair(pool[i]!, pool[j]!));
    used.add(i);
    used.add(j);
    mask ^= (1 << i) | (1 << j);
  }

  const remaining = pool.filter((_, idx) => !used.has(idx));
  let sameGymCount = 0;
  for (const p of pairs) {
    if (p.sameGymWarning) sameGymCount += 1;
  }
  return { pairs, remaining, sameGymCount };
}

/**
 * soft cost → blossom weight (maximize).
 * maxCardinality=true 이므로 1순위는 경기 수.
 * 동일 cardinality 안에서 Σweight → grade → record → tie 최소화.
 */
function blossomEdgeWeight(cost: EdgeCost, tieRank: number): number {
  const w = Math.min(cost.weightMilli, BLOSSOM_WEIGHT_MILLI_CAP);
  // units: weight milli dominates grade/record/tie without float
  return -(w * 1_000_000 + cost.grade * 1_000 + cost.record * 10 + tieRank);
}

function optimalPairPoolBlossom(
  pool: RecordMatchCandidate[],
  canEdge: (a: RecordMatchCandidate, b: RecordMatchCandidate) => boolean,
): PoolPairResult {
  const n = pool.length;
  const rawEdges: Array<{ i: number; j: number; cost: EdgeCost }> = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (!canEdge(pool[i]!, pool[j]!)) continue;
      rawEdges.push({ i, j, cost: edgeCost(pool[i]!, pool[j]!) });
    }
  }

  rawEdges.sort((a, b) => a.cost.tie.localeCompare(b.cost.tie));
  const edges: Array<[number, number, number]> = rawEdges.map((e, rank) => [
    e.i,
    e.j,
    blossomEdgeWeight(e.cost, rank),
  ]);

  const mate = maxWeightMatching(edges, true);
  const pairs: RecordMatchPair[] = [];
  const used = new Set<number>();
  let sameGymCount = 0;

  for (let i = 0; i < n; i++) {
    const j = mate[i] ?? -1;
    if (j < 0 || j <= i) continue;
    if (used.has(i) || used.has(j)) continue;
    used.add(i);
    used.add(j);
    const pair = toPair(pool[i]!, pool[j]!);
    if (pair.sameGymWarning) sameGymCount += 1;
    pairs.push(pair);
  }

  // deterministic pair order
  pairs.sort((a, b) => {
    const ka = [a.red.applicationId, a.blue.applicationId].sort().join("|");
    const kb = [b.red.applicationId, b.blue.applicationId].sort().join("|");
    return ka.localeCompare(kb);
  });

  const remaining = pool.filter((_, idx) => !used.has(idx));
  return { pairs, remaining, sameGymCount };
}

/**
 * 결과 unmatched 집합에 hard-compatible pair가 남아 있으면 maximal matching 실패.
 * (maximum matching의 완전 증명은 아니나, 누락 pair regression guard)
 */
export function findCompatibleUnmatchedPair(
  unmatched: RecordMatchCandidate[],
  options: RecordPairOptions = {},
  extraEdgeOk?: (a: RecordMatchCandidate, b: RecordMatchCandidate) => boolean,
): { a: RecordMatchCandidate; b: RecordMatchCandidate } | null {
  const forbidSameGym = options.forbidSameGym !== false;
  for (let i = 0; i < unmatched.length; i++) {
    for (let j = i + 1; j < unmatched.length; j++) {
      const a = unmatched[i]!;
      const b = unmatched[j]!;
      if (a.totalBouts == null || b.totalBouts == null) continue;
      if (a.totalBouts === 0 || b.totalBouts === 0) {
        if (!(a.totalBouts === 0 && b.totalBouts === 0)) continue;
      } else if (Math.abs(a.totalBouts - b.totalBouts) > 1) {
        continue;
      }
      if (!hardEdgeOk(a, b, forbidSameGym)) continue;
      if (extraEdgeOk && !extraEdgeOk(a, b)) continue;
      return { a, b };
    }
  }
  return null;
}

function pairWithinPool(
  pool: RecordMatchCandidate[],
  forbidSameGym: boolean,
): PoolPairResult {
  return optimalPairPool(pool, forbidSameGym);
}

function pairLeftoverByOneDiff(
  sorted: RecordMatchCandidate[],
  forbidSameGym: boolean,
): PoolPairResult {
  return optimalPairPool(sorted, forbidSameGym, (a, b) => {
    if (a.totalBouts == null || b.totalBouts == null) return false;
    return Math.abs(a.totalBouts - b.totalBouts) === 1;
  });
}

export function pairAllDivisionsWithRecord(
  candidates: RecordMatchCandidate[],
  options?: RecordPairOptions,
): RecordDivisionPairingResult[] {
  const byDivision = new Map<string, RecordMatchCandidate[]>();
  for (const c of candidates) {
    const arr = byDivision.get(c.divisionId) ?? [];
    arr.push(c);
    byDivision.set(c.divisionId, arr);
  }

  const results: RecordDivisionPairingResult[] = [];
  for (const [, group] of byDivision) {
    results.push(pairWithRecordAndGrade(group, options));
  }
  return results;
}
