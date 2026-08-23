import type { OrganizerApprovedFighterOptionVM } from "@/lib/services/bracket.service";
import { parseRecordText } from "@/lib/fighter/record";

export type UnmatchedRecordStatusFilter = "all" | "zero" | "experienced";

export type UnmatchedQuickBarFilterState = {
  search: string;
  ageGroups: string[];
  genders: string[];
  weights: number[];
  recordStatus: UnmatchedRecordStatusFilter;
  /** 유전 선택 시만 사용. 빈 문자열 = 상한 없음(1전 이상) */
  maxTotalBouts: string;
};

export const DEFAULT_UNMATCHED_QUICK_BAR_FILTERS: UnmatchedQuickBarFilterState = {
  search: "",
  ageGroups: [],
  genders: [],
  weights: [],
  recordStatus: "all",
  maxTotalBouts: "",
};

const AGE_GROUP_SORT_ORDER = [
  "초등부",
  "중등부",
  "고등부",
  "일반부",
  "대학·일반부",
  "성인부",
] as const;

/** 자동매칭 recordSummary("N승 N패 N무") → totalBouts — parseRecordText SSOT */
export function resolveUnmatchedCandidateTotalBouts(
  recordSummary: string,
): number | null {
  const trimmed = recordSummary.trim();
  if (!trimmed) return 0;

  const parsed = parseRecordText(trimmed);
  if (parsed.ok) return parsed.record.totalBouts;

  const winsLossesDraws = trimmed.match(/^(\d+)\s*승\s*(\d+)\s*패\s*(\d+)\s*무$/);
  if (winsLossesDraws) {
    const wins = Number(winsLossesDraws[1]);
    const losses = Number(winsLossesDraws[2]);
    const draws = Number(winsLossesDraws[3]);
    return wins + losses + draws;
  }

  return null;
}

export function resolveUnmatchedCandidateGenderLabel(
  option: OrganizerApprovedFighterOptionVM,
): string | null {
  const fighterGender = (option.fighterGender ?? "").trim().toLowerCase();
  if (fighterGender === "male") return "남성";
  if (fighterGender === "female") return "여성";

  const divisionGender = (option.division.gender ?? "").trim().toLowerCase();
  if (divisionGender === "male") return "남성";
  if (divisionGender === "female") return "여성";

  return null;
}

export function resolveUnmatchedCandidateAgeGroup(
  option: OrganizerApprovedFighterOptionVM,
): string | null {
  const ageGroup = option.division.ageGroup?.trim();
  return ageGroup || null;
}

export function formatUnmatchedWeightFilterLabel(kg: number): string {
  return `${kg}kg`;
}

function sortAgeGroups(values: string[]): string[] {
  return [...values].sort((a, b) => {
    const ia = AGE_GROUP_SORT_ORDER.indexOf(
      a as (typeof AGE_GROUP_SORT_ORDER)[number],
    );
    const ib = AGE_GROUP_SORT_ORDER.indexOf(
      b as (typeof AGE_GROUP_SORT_ORDER)[number],
    );
    if (ia !== -1 || ib !== -1) {
      const ra = ia === -1 ? AGE_GROUP_SORT_ORDER.length : ia;
      const rb = ib === -1 ? AGE_GROUP_SORT_ORDER.length : ib;
      if (ra !== rb) return ra - rb;
    }
    return a.localeCompare(b, "ko");
  });
}

export function buildUnmatchedQuickBarFilterOptions(
  options: OrganizerApprovedFighterOptionVM[],
) {
  const ageGroups = new Set<string>();
  const genders = new Set<string>();
  const weights = new Set<number>();

  for (const option of options) {
    const ageGroup = resolveUnmatchedCandidateAgeGroup(option);
    if (ageGroup) ageGroups.add(ageGroup);

    const gender = resolveUnmatchedCandidateGenderLabel(option);
    if (gender) genders.add(gender);

    if (option.applicationWeightKg != null) {
      weights.add(option.applicationWeightKg);
    }
  }

  return {
    ageGroups: sortAgeGroups([...ageGroups]),
    genders: [...genders].sort((a, b) => a.localeCompare(b, "ko")),
    weights: [...weights].sort((a, b) => a - b),
  };
}

function matchesSearch(
  option: OrganizerApprovedFighterOptionVM,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    option.fighterName.toLowerCase().includes(q) ||
    option.gymName.toLowerCase().includes(q) ||
    option.currentDivisionLabel.toLowerCase().includes(q) ||
    option.appliedDivisionLabel.toLowerCase().includes(q)
  );
}

function matchesRecordFilter(
  option: OrganizerApprovedFighterOptionVM,
  recordStatus: UnmatchedRecordStatusFilter,
  maxTotalBoutsRaw: string,
): boolean {
  if (recordStatus === "all") return true;

  const totalBouts = resolveUnmatchedCandidateTotalBouts(option.recordSummary);
  if (totalBouts == null) return false;

  if (recordStatus === "zero") {
    return totalBouts === 0;
  }

  if (totalBouts < 1) return false;

  const maxRaw = maxTotalBoutsRaw.trim();
  if (!maxRaw) return true;

  const max = Number.parseInt(maxRaw, 10);
  if (!Number.isFinite(max) || max < 1) return false;

  return totalBouts <= max;
}

export function filterUnmatchedQuickBarOptions(
  options: OrganizerApprovedFighterOptionVM[],
  filters: UnmatchedQuickBarFilterState,
): OrganizerApprovedFighterOptionVM[] {
  return options.filter((option) => {
    if (!matchesSearch(option, filters.search)) return false;

    if (filters.ageGroups.length > 0) {
      const ageGroup = resolveUnmatchedCandidateAgeGroup(option);
      if (!ageGroup || !filters.ageGroups.includes(ageGroup)) return false;
    }

    if (filters.genders.length > 0) {
      const gender = resolveUnmatchedCandidateGenderLabel(option);
      if (!gender || !filters.genders.includes(gender)) return false;
    }

    if (filters.weights.length > 0) {
      if (
        option.applicationWeightKg == null ||
        !filters.weights.includes(option.applicationWeightKg)
      ) {
        return false;
      }
    }

    if (
      !matchesRecordFilter(
        option,
        filters.recordStatus,
        filters.maxTotalBouts,
      )
    ) {
      return false;
    }

    return true;
  });
}

export function buildUnmatchedQuickBarFilterChips(
  filters: UnmatchedQuickBarFilterState,
): string[] {
  const chips: string[] = [];
  for (const ageGroup of filters.ageGroups) chips.push(ageGroup);
  for (const gender of filters.genders) chips.push(gender);
  for (const weight of filters.weights) {
    chips.push(formatUnmatchedWeightFilterLabel(weight));
  }
  if (filters.recordStatus === "zero") chips.push("무전");
  if (filters.recordStatus === "experienced") {
    chips.push("유전");
    const maxRaw = filters.maxTotalBouts.trim();
    if (maxRaw) chips.push(`${maxRaw}전 이하`);
  }
  return chips;
}

export function hasActiveUnmatchedQuickBarFilters(
  filters: UnmatchedQuickBarFilterState,
): boolean {
  return (
    filters.search.trim().length > 0 ||
    filters.ageGroups.length > 0 ||
    filters.genders.length > 0 ||
    filters.weights.length > 0 ||
    filters.recordStatus !== "all"
  );
}
