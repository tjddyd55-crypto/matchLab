/**
 * 전적·학년 기반 자동매칭 엔진 V2
 *
 * 기존 auto-match.ts(성별·체급·체육관 필터)를 확장.
 * 이 모듈은 순수 함수 — DB/IO 없음.
 *
 * 매칭 규칙:
 * 1. 무전(totalBouts=0)은 무전끼리만 자동매칭
 * 2. 같은 totalBouts끼리 먼저 매칭
 * 3. 동일전적 pair 소진 후 남은 선수: |diff|=1 허용 (0전 예외)
 * 4. 낮은 totalBouts부터 greedy
 * 5. |diff|>=2 자동매칭 금지 → 미확정
 * 6. 초등부: ELEMENTARY_LOW(1~3) ↔ ELEMENTARY_HIGH(4~6) 크로스 금지
 * 7. 같은 학년 우선 (score 기반)
 */

import { isSameGym } from "@/lib/brackets/gym-match-key";
import {
  getElementaryMatchBand,
  SCHOOL_LEVEL,
  type ElementaryMatchBand,
} from "@/lib/fighter/record";

// ────────────────────────────────────────────────────
// 확장 후보 타입
// ────────────────────────────────────────────────────

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
  /** 신청 시점 구조화 전적 snapshot */
  totalBouts: number | null;
  /** 신청 시점 구조화 학교급 snapshot */
  schoolLevel: string | null;
  /** 신청 시점 구조화 학년 snapshot */
  schoolGrade: number | null;
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

// ────────────────────────────────────────────────────
// 내부 유틸
// ────────────────────────────────────────────────────

function isSameGymCandidate(
  a: RecordMatchCandidate,
  b: RecordMatchCandidate,
): boolean {
  return isSameGym(a, b);
}

/** 초등부 band 비교. 비초등부는 null 반환 */
function elementaryBandOf(c: RecordMatchCandidate): ElementaryMatchBand | null {
  if (c.schoolLevel !== SCHOOL_LEVEL.ELEMENTARY) return null;
  if (c.schoolGrade == null) return null;
  return getElementaryMatchBand(c.schoolGrade);
}

/**
 * 두 후보 간 초등부 band 호환 여부.
 * 한쪽이 초등부이면 반드시 같은 band여야 함.
 */
function isElementaryBandCompatible(
  a: RecordMatchCandidate,
  b: RecordMatchCandidate,
): boolean {
  const bandA = elementaryBandOf(a);
  const bandB = elementaryBandOf(b);
  if (bandA === null && bandB === null) return true; // 둘 다 비초등부
  if (bandA !== bandB) return false; // 한쪽만 초등부이거나 다른 band
  return true;
}

/** deterministic 정렬: totalBouts ASC → appliedAt ASC → applicationId ASC */
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

/**
 * 두 후보 간 학년 우선순위 score (낮을수록 좋음).
 * 같은 학년: 0, 차이 1: 1, ...
 */
function gradeDiffScore(
  a: RecordMatchCandidate,
  b: RecordMatchCandidate,
): number {
  if (a.schoolLevel !== b.schoolLevel) return 999;
  if (a.schoolGrade == null || b.schoolGrade == null) return 0;
  return Math.abs(a.schoolGrade - b.schoolGrade);
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
  if (a.schoolLevel === SCHOOL_LEVEL.ELEMENTARY) {
    const band = elementaryBandOf(a);
    parts.push(band === "LOW" ? "초1~3 그룹" : "초4~6 그룹");
    if (a.schoolGrade === b.schoolGrade) parts.push("같은 학년");
  }
  return parts.join(", ") || "조건 충족";
}

// ────────────────────────────────────────────────────
// 핵심 페어링 로직
// ────────────────────────────────────────────────────

export type RecordPairOptions = {
  /** true(기본): 같은 체육관끼리 매칭 금지 */
  forbidSameGym?: boolean;
};

/**
 * division 내 전적·학년 기반 페어링.
 *
 * 알고리즘:
 * Step 1. eligibility 필터
 * Step 2. unknown record → 미확정
 * Step 3. 0전 pool 분리 → 0전끼리만 페어
 * Step 4. 나머지 totalBouts별 그룹 → 동일전적 페어 먼저
 * Step 5. 남은 후보 낮은 totalBouts부터 ±1 페어
 * Step 6. 그래도 남은 후보 → 미확정
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

  // Step 1: 대진 배치 가능만 필터.
  // 계체 전(isEligibleForBracket=false)은 신청자 기준 자동대진에 포함한다.
  // 계체 완료 선수만 쓰려면 generate 쪽 eligibleOnly를 켠다.
  const eligible: RecordMatchCandidate[] = [];
  for (const c of candidates) {
    if (!c.isAssignableForBracket) {
      unmatched.push({ ...c, reason: "not_field_eligible", reasonLabel: "출전 조건 미충족" });
      continue;
    }
    eligible.push(c);
  }

  // Step 2: unknown record 분리
  const knownPool: RecordMatchCandidate[] = [];
  for (const c of eligible) {
    if (c.totalBouts == null) {
      unmatched.push({ ...c, reason: "unknown_record", reasonLabel: "전적 정보 없음" });
      continue;
    }
    knownPool.push(c);
  }

  // Step 3: 0전 분리 → 0전끼리만 pair
  const zeroPool = knownPool.filter((c) => c.totalBouts === 0);
  const nonZeroPool = knownPool.filter((c) => (c.totalBouts ?? 0) > 0);

  const pairedZero = pairWithinPool(zeroPool, forbidSameGym, sameGymPairCount);
  pairs.push(...pairedZero.pairs);
  unmatched.push(
    ...pairedZero.remaining.map((c) => ({
      ...c,
      reason: "zero_vs_nonzero" as RecordUnmatchedReason,
      reasonLabel: "무전 — 무전 상대 없음",
    })),
  );
  sameGymPairCount += pairedZero.sameGymCount;

  // Step 4: 동일전적 그룹 페어
  const sortedNonZero = sortCandidates(nonZeroPool);
  const byBouts = groupByTotalBouts(sortedNonZero);
  let leftover: RecordMatchCandidate[] = [];

  for (const [, group] of byBouts) {
    const result = pairWithinPool(group, forbidSameGym, 0);
    pairs.push(...result.pairs);
    sameGymPairCount += result.sameGymCount;
    leftover.push(...result.remaining);
  }

  // Step 5: 남은 후보 ±1 전적 페어 (낮은 totalBouts 우선)
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

// ────────────────────────────────────────────────────
// 내부 헬퍼
// ────────────────────────────────────────────────────

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

/**
 * pool 내 순서대로 greedy 페어링.
 * 초등부 band 체크 + 같은 체육관 회피 포함.
 * 같은 학년 우선(gradeDiffScore가 낮은 상대 선택).
 */
function pairWithinPool(
  pool: RecordMatchCandidate[],
  forbidSameGym: boolean,
  _sameGymBase: number,
): PoolPairResult {
  const working = [...pool];
  const pairs: RecordMatchPair[] = [];
  const sameGymOnly: RecordMatchCandidate[] = [];
  let sameGymCount = 0;

  while (working.length >= 2) {
    const first = working.shift()!;

    const candidates = working
      .map((c, idx) => ({ c, idx }))
      .filter(({ c }) => isElementaryBandCompatible(first, c));

    if (candidates.length === 0) {
      working.unshift(first);
      break;
    }

    const diffGymCandidates = candidates.filter(({ c }) => !isSameGymCandidate(first, c));
    if (forbidSameGym && diffGymCandidates.length === 0) {
      sameGymOnly.push(first);
      continue;
    }

    const pool2 = forbidSameGym ? diffGymCandidates : candidates;

    pool2.sort((a, b) => gradeDiffScore(first, a.c) - gradeDiffScore(first, b.c));

    const best = pool2[0]!;
    working.splice(best.idx, 1);

    const sameGym = isSameGymCandidate(first, best.c);
    if (sameGym) sameGymCount += 1;

    pairs.push({
      red: first,
      blue: best.c,
      sameGymWarning: sameGym,
      matchReason: buildMatchReason(first, best.c),
    });
  }

  return { pairs, remaining: [...working, ...sameGymOnly], sameGymCount };
}

/**
 * 남은 후보끼리 totalBouts 차이 정확히 1인 경우만 페어링.
 * 낮은 totalBouts 선수부터 greedy 처리.
 */
function pairLeftoverByOneDiff(
  sorted: RecordMatchCandidate[],
  forbidSameGym: boolean,
): PoolPairResult {
  const working = [...sorted];
  const pairs: RecordMatchPair[] = [];
  let sameGymCount = 0;

  let i = 0;
  while (i < working.length) {
    const first = working[i]!;
    const firstBouts = first.totalBouts!;

    // diff=1인 상대 탐색
    const compatIdx = working.findIndex((c, idx) => {
      if (idx === i) return false;
      if (Math.abs(c.totalBouts! - firstBouts) !== 1) return false;
      if (!isElementaryBandCompatible(first, c)) return false;
      return true;
    });

    if (compatIdx < 0) {
      i++;
      continue;
    }

    // 체육관 회피
    const partnerIdx = (() => {
      if (!forbidSameGym) return compatIdx;
      const diffGym = working.findIndex((c, idx) => {
        if (idx === i) return false;
        if (Math.abs(c.totalBouts! - firstBouts) !== 1) return false;
        if (!isElementaryBandCompatible(first, c)) return false;
        if (isSameGymCandidate(first, c)) return false;
        return true;
      });
      return diffGym >= 0 ? diffGym : compatIdx;
    })();

    const partner = working[partnerIdx]!;
    const sameGym = isSameGymCandidate(first, partner);
    if (sameGym) sameGymCount += 1;

    pairs.push({
      red: first,
      blue: partner,
      sameGymWarning: sameGym,
      matchReason: buildMatchReason(first, partner),
    });

    // 높은 index 먼저 제거
    const removeFirst = Math.max(i, partnerIdx);
    const removeSecond = Math.min(i, partnerIdx);
    working.splice(removeFirst, 1);
    working.splice(removeSecond, 1);
    // i는 그대로 (삭제 후 다음 요소가 동일 위치)
    if (i >= removeSecond) i = Math.max(0, i - 1);
  }

  return { pairs, remaining: working, sameGymCount };
}

// ────────────────────────────────────────────────────
// 전체 division 일괄
// ────────────────────────────────────────────────────

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
