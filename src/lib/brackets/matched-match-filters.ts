import type { OrganizerApprovedFighterOptionVM } from "@/lib/services/bracket.service";
import type { OrganizerBracketMatchVM } from "@/lib/services/bracket.service";
import {
  DEFAULT_UNMATCHED_QUICK_BAR_FILTERS,
  filterUnmatchedQuickBarOptions,
  resolveUnmatchedCandidateGenderLabel,
  resolveUnmatchedCandidateTotalBouts,
  type UnmatchedQuickBarFilterState,
  type UnmatchedRecordStatusFilter,
} from "@/lib/brackets/unmatched-candidate-filters";

/** 잡힌 경기(Match) 필터 — unmatchedFilters와 완전 독립 SSOT */
export type MatchedMatchFilterState = {
  search: string;
  gyms: string[];
  genders: string[];
  weights: number[];
  recordStatus: UnmatchedRecordStatusFilter;
  maxTotalBouts: string;
  divisions: string[];
};

export const DEFAULT_MATCHED_MATCH_FILTERS: MatchedMatchFilterState = {
  search: "",
  gyms: [],
  genders: [],
  weights: [],
  recordStatus: "all",
  maxTotalBouts: "",
  divisions: [],
};

export function hasActiveMatchedMatchFilters(
  filters: MatchedMatchFilterState,
): boolean {
  return (
    filters.search.trim().length > 0 ||
    filters.gyms.length > 0 ||
    filters.genders.length > 0 ||
    filters.weights.length > 0 ||
    filters.recordStatus !== "all" ||
    filters.divisions.length > 0
  );
}

function resolveOptionForFighter(
  fighterId: string | null,
  optionsById: Map<string, OrganizerApprovedFighterOptionVM>,
): OrganizerApprovedFighterOptionVM | null {
  if (!fighterId) return null;
  return optionsById.get(fighterId) ?? null;
}

function optionMatchesGymFilter(
  option: OrganizerApprovedFighterOptionVM | null,
  gyms: string[],
): boolean {
  if (gyms.length === 0) return true;
  if (!option) return false;
  return gyms.includes(option.gymName);
}

function optionMatchesGenderFilter(
  option: OrganizerApprovedFighterOptionVM | null,
  genders: string[],
): boolean {
  if (genders.length === 0) return true;
  if (!option) return false;
  const gender = resolveUnmatchedCandidateGenderLabel(option);
  return Boolean(gender && genders.includes(gender));
}

function optionMatchesWeightFilter(
  option: OrganizerApprovedFighterOptionVM | null,
  weights: number[],
): boolean {
  if (weights.length === 0) return true;
  if (!option || option.applicationWeightKg == null) return false;
  return weights.includes(option.applicationWeightKg);
}

function optionMatchesRecordFilter(
  option: OrganizerApprovedFighterOptionVM | null,
  recordStatus: UnmatchedRecordStatusFilter,
  maxTotalBouts: string,
): boolean {
  if (recordStatus === "all") return true;
  if (!option) return false;
  const total = resolveUnmatchedCandidateTotalBouts(option.recordSummary);
  if (total == null) return false;
  if (recordStatus === "zero") return total === 0;
  if (total < 1) return false;
  const maxRaw = maxTotalBouts.trim();
  if (!maxRaw) return true;
  const max = Number.parseInt(maxRaw, 10);
  if (!Number.isFinite(max) || max < 1) return false;
  return total <= max;
}

function optionMatchesDivisionFilter(
  option: OrganizerApprovedFighterOptionVM | null,
  divisions: string[],
): boolean {
  if (divisions.length === 0) return true;
  if (!option) return false;
  return (
    divisions.includes(option.currentDivisionLabel) ||
    divisions.includes(option.appliedDivisionLabel)
  );
}

function optionMatchesSearch(
  option: OrganizerApprovedFighterOptionVM | null,
  query: string,
): boolean {
  if (!query) return false;
  if (!option) return false;
  const q = query.trim().toLowerCase();
  return (
    option.fighterName.toLowerCase().includes(q) ||
    option.gymName.toLowerCase().includes(q) ||
    option.currentDivisionLabel.toLowerCase().includes(q) ||
    option.appliedDivisionLabel.toLowerCase().includes(q)
  );
}

function fighterSideMatchesFilters(
  option: OrganizerApprovedFighterOptionVM | null,
  filters: MatchedMatchFilterState,
): boolean {
  if (!option) return false;
  if (!optionMatchesGymFilter(option, filters.gyms)) return false;
  if (!optionMatchesGenderFilter(option, filters.genders)) return false;
  if (!optionMatchesWeightFilter(option, filters.weights)) return false;
  if (
    !optionMatchesRecordFilter(
      option,
      filters.recordStatus,
      filters.maxTotalBouts,
    )
  ) {
    return false;
  }
  if (!optionMatchesDivisionFilter(option, filters.divisions)) return false;
  return true;
}

/**
 * Match 단위 필터. 한 쪽 선수라도 검색/필터에 맞으면 Match 전체를 유지.
 * 검색만 활성일 때는 한쪽만 검색 일치해도 통과.
 * 구조 필터(체육관·성별 등)는 한쪽이 만족하면 통과 (OR across corners).
 */
export function filterMatchedMatches(
  matches: OrganizerBracketMatchVM[],
  options: OrganizerApprovedFighterOptionVM[],
  filters: MatchedMatchFilterState,
): OrganizerBracketMatchVM[] {
  const optionsById = new Map(options.map((o) => [o.fighterId, o]));
  const q = filters.search.trim().toLowerCase();
  const hasStructure =
    filters.gyms.length > 0 ||
    filters.genders.length > 0 ||
    filters.weights.length > 0 ||
    filters.recordStatus !== "all" ||
    filters.divisions.length > 0;

  if (!q && !hasStructure) return matches;

  return matches.filter((match) => {
    const red = resolveOptionForFighter(match.fighterRedId, optionsById);
    const blue = resolveOptionForFighter(match.fighterBlueId, optionsById);

    const searchHit =
      !q ||
      optionMatchesSearch(red, q) ||
      optionMatchesSearch(blue, q) ||
      (match.fighterRedSnapshot?.name ?? "").toLowerCase().includes(q) ||
      (match.fighterBlueSnapshot?.name ?? "").toLowerCase().includes(q) ||
      (match.fighterRedSnapshot?.gymName ?? "").toLowerCase().includes(q) ||
      (match.fighterBlueSnapshot?.gymName ?? "").toLowerCase().includes(q);

    if (!searchHit) return false;

    if (!hasStructure) return true;

    return (
      fighterSideMatchesFilters(red, filters) ||
      fighterSideMatchesFilters(blue, filters)
    );
  });
}

export function buildMatchedMatchFilterOptions(
  matches: OrganizerBracketMatchVM[],
  options: OrganizerApprovedFighterOptionVM[],
) {
  const optionsById = new Map(options.map((o) => [o.fighterId, o]));
  const gyms = new Set<string>();
  const genders = new Set<string>();
  const weights = new Set<number>();
  const divisions = new Set<string>();

  for (const match of matches) {
    for (const id of [match.fighterRedId, match.fighterBlueId]) {
      const option = resolveOptionForFighter(id, optionsById);
      if (!option) continue;
      if (option.gymName.trim()) gyms.add(option.gymName);
      const gender = resolveUnmatchedCandidateGenderLabel(option);
      if (gender) genders.add(gender);
      if (option.applicationWeightKg != null) {
        weights.add(option.applicationWeightKg);
      }
      if (option.currentDivisionLabel.trim()) {
        divisions.add(option.currentDivisionLabel);
      }
    }
  }

  return {
    gyms: [...gyms].sort((a, b) => a.localeCompare(b, "ko")),
    genders: [...genders].sort((a, b) => a.localeCompare(b, "ko")),
    weights: [...weights].sort((a, b) => a - b),
    divisions: [...divisions].sort((a, b) => a.localeCompare(b, "ko")),
  };
}

/** unmatched filter state로 옵션 필터 (gym 확장 전 호환) */
export function toUnmatchedFilterStateFromMatched(
  filters: MatchedMatchFilterState,
): UnmatchedQuickBarFilterState {
  return {
    ...DEFAULT_UNMATCHED_QUICK_BAR_FILTERS,
    search: filters.search,
    genders: filters.genders,
    weights: filters.weights,
    recordStatus: filters.recordStatus,
    maxTotalBouts: filters.maxTotalBouts,
  };
}

export function filterOptionsByMatchedFilters(
  options: OrganizerApprovedFighterOptionVM[],
  filters: MatchedMatchFilterState,
): OrganizerApprovedFighterOptionVM[] {
  let list = filterUnmatchedQuickBarOptions(
    options,
    toUnmatchedFilterStateFromMatched(filters),
  );
  if (filters.gyms.length > 0) {
    list = list.filter((o) => filters.gyms.includes(o.gymName));
  }
  if (filters.divisions.length > 0) {
    list = list.filter(
      (o) =>
        filters.divisions.includes(o.currentDivisionLabel) ||
        filters.divisions.includes(o.appliedDivisionLabel),
    );
  }
  return list;
}
