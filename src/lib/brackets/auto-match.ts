/**
 * 대진표 자동 1차 매칭 — 순수 페어링·그룹핑 로직 (DB/IO 없음).
 */

export type AutoMatchCandidate = {
  applicationId: string;
  fighterId: string;
  divisionId: string;
  gymId: string;
  gymName: string;
  fighterName: string;
  appliedAt: Date;
  isEligibleForBracket: boolean;
};

export type AutoMatchPair = {
  red: AutoMatchCandidate;
  blue: AutoMatchCandidate;
  sameGymWarning: boolean;
};

export type DivisionPairingResult = {
  divisionId: string;
  pairs: AutoMatchPair[];
  unmatched: AutoMatchCandidate[];
  sameGymPairCount: number;
};

export type UnmatchedReason =
  | "odd_count"
  | "no_opponent_in_division"
  | "not_field_eligible"
  | "already_placed"
  | "missing_division";

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
 * 같은 division 내 2명씩 페어링. 같은 체육관 매칭은 가능한 피하되, 불가피하면 허용.
 * TODO: 자동 bye 승급(홀수 인원 부전승) — MVP 제외.
 */
export function pairCandidatesWithinDivision(
  candidates: AutoMatchCandidate[],
): DivisionPairingResult {
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
  const unmatched: AutoMatchCandidate[] = [];
  let sameGymPairCount = 0;

  const working = [...pool];

  while (working.length >= 2) {
    const first = working.shift()!;
    const diffGymIdx = working.findIndex((p) => p.gymId !== first.gymId);
    const partnerIdx = diffGymIdx >= 0 ? diffGymIdx : 0;
    const partner = working.splice(partnerIdx, 1)[0]!;
    const sameGym = first.gymId === partner.gymId;
    if (sameGym) sameGymPairCount += 1;
    pairs.push({
      red: first,
      blue: partner,
      sameGymWarning: sameGym,
    });
  }

  if (working.length === 1) {
    unmatched.push(working[0]!);
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
): DivisionPairingResult[] {
  const byDivision = groupCandidatesByDivision(candidates);
  const results: DivisionPairingResult[] = [];
  for (const [, group] of byDivision) {
    results.push(pairCandidatesWithinDivision(group));
  }
  return results;
}
