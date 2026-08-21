/**
 * 대진표 자동 1차 매칭 — 순수 페어링·그룹핑 로직 (DB/IO 없음).
 */

import { isSameGym } from "@/lib/brackets/gym-match-key";

export type AutoMatchCandidate = {
  applicationId: string;
  fighterId: string;
  divisionId: string;
  gymId: string;
  gymName: string;
  fighterName: string;
  appliedAt: Date;
  /** 출전 확정(현장·계체 완료) */
  isEligibleForBracket: boolean;
  /** 대진 배치 가능 */
  isAssignableForBracket: boolean;
};

export type AutoMatchPair = {
  red: AutoMatchCandidate;
  blue: AutoMatchCandidate;
  sameGymWarning: boolean;
};

export type UnmatchedReason =
  | "odd_count"
  | "no_opponent_in_division"
  | "not_field_eligible"
  | "already_placed"
  | "missing_division"
  | "division_review_required"
  | "same_gym_only_remaining"
  | "court_capacity_full"
  /** 출전 가능하지만 활성 Match 슬롯 미배정 (운영 화면 SSOT) */
  | "not_assigned";

export type UnmatchedCandidate = AutoMatchCandidate & {
  reason: UnmatchedReason;
};

export type DivisionPairingResult = {
  divisionId: string;
  pairs: AutoMatchPair[];
  unmatched: UnmatchedCandidate[];
  sameGymPairCount: number;
};

export type PairCandidatesOptions = {
  /** true(기본): 같은 체육관끼리 매칭 금지 */
  forbidSameGym?: boolean;
};

export function sortAutoMatchCandidates(
  candidates: AutoMatchCandidate[],
): AutoMatchCandidate[] {
  return [...candidates].sort((a, b) => {
    const gymCmp = a.gymName.localeCompare(b.gymName, "ko");
    if (gymCmp !== 0) return gymCmp;
    const nameCmp = a.fighterName.localeCompare(b.fighterName, "ko");
    if (nameCmp !== 0) return nameCmp;
    const dateCmp = a.appliedAt.getTime() - b.appliedAt.getTime();
    if (dateCmp !== 0) return dateCmp;
    return a.fighterId.localeCompare(b.fighterId);
  });
}

export function groupCandidatesByDivision(
  candidates: AutoMatchCandidate[],
): Map<string, AutoMatchCandidate[]> {
  const map = new Map<string, AutoMatchCandidate[]>();
  for (const c of candidates) {
    const list = map.get(c.divisionId) ?? [];
    list.push(c);
    map.set(c.divisionId, list);
  }
  return map;
}

/**
 * 같은 division 내 2명씩 페어링.
 * forbidSameGym=true 이면 같은 체육관끼리 매칭하지 않고 unmatched 처리.
 */
export function pairCandidatesWithinDivision(
  candidates: AutoMatchCandidate[],
  options: PairCandidatesOptions = {},
): DivisionPairingResult {
  const forbidSameGym = options.forbidSameGym !== false;

  if (candidates.length === 0) {
    return {
      divisionId: "",
      pairs: [],
      unmatched: [],
      sameGymPairCount: 0,
    };
  }

  const divisionId = candidates[0]!.divisionId;
  const pool = sortAutoMatchCandidates(candidates);
  const pairs: AutoMatchPair[] = [];
  const unmatched: UnmatchedCandidate[] = [];
  let sameGymPairCount = 0;

  const working = [...pool];

  while (working.length >= 2) {
    const first = working.shift()!;
    const diffGymIdx = working.findIndex((p) => !isSameGym(p, first));

    if (forbidSameGym && diffGymIdx < 0) {
      unmatched.push({
        ...first,
        reason: "same_gym_only_remaining",
      });
      continue;
    }

    const partnerIdx = diffGymIdx >= 0 ? diffGymIdx : 0;
    const partner = working.splice(partnerIdx, 1)[0]!;
    const sameGym = isSameGym(first, partner);
    if (sameGym) sameGymPairCount += 1;
    pairs.push({
      red: first,
      blue: partner,
      sameGymWarning: sameGym,
    });
  }

  if (working.length === 1) {
    unmatched.push({
      ...working[0]!,
      reason: "odd_count",
    });
  }

  return {
    divisionId,
    pairs,
    unmatched,
    sameGymPairCount,
  };
}

export function pairAllDivisions(
  candidates: AutoMatchCandidate[],
  options?: PairCandidatesOptions,
): DivisionPairingResult[] {
  const byDivision = groupCandidatesByDivision(candidates);
  const results: DivisionPairingResult[] = [];
  for (const [, group] of byDivision) {
    results.push(pairCandidatesWithinDivision(group, options));
  }
  return results;
}
