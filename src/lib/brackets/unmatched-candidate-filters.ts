import type { OrganizerApprovedFighterOptionVM } from "@/lib/services/bracket.service";
import {
  matchesFightRecordExperienceFilter,
  resolveFightRecordTotalBouts,
} from "@/lib/fighter/fight-record-total-bouts";
import {
  buildSchoolGradeFilterOptions,
  resolveApplicationSchoolGradeLabel,
} from "@/lib/fighter/school-grade-input";

export type UnmatchedRecordStatusFilter = "all" | "zero" | "experienced";

export type UnmatchedQuickBarFilterState = {
  search: string;
  ageGroups: string[];
  genders: string[];
  weights: number[];
  gyms: string[];
  schoolGrades: string[];
  recordStatus: UnmatchedRecordStatusFilter;
  /** 유전 선택 시만 사용. 빈 문자열 = 상한 없음(1전 이상) */
  maxTotalBouts: string;
};

export const DEFAULT_UNMATCHED_QUICK_BAR_FILTERS: UnmatchedQuickBarFilterState = {
  search: "",
  ageGroups: [],
  genders: [],
  weights: [],
  gyms: [],
  schoolGrades: [],
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

/** filter SSOT — structured snapshot 우선, `"9전"` 등 총전-only 지원 */
export function resolveUnmatchedCandidateTotalBouts(
  recordSummary: string,
  structured?: Pick<
    OrganizerApprovedFighterOptionVM,
    "totalBoutsSnapshot" | "recordText"
  >,
): number | null {
  return resolveFightRecordTotalBouts({
    recordSummary,
    recordText: structured?.recordText,
    totalBoutsSnapshot: structured?.totalBoutsSnapshot,
  });
}

export function resolveApprovedOptionTotalBouts(
  option: Pick<
    OrganizerApprovedFighterOptionVM,
    "recordSummary" | "totalBoutsSnapshot" | "recordText"
  >,
): number | null {
  return resolveUnmatchedCandidateTotalBouts(option.recordSummary, option);
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
  const gyms = new Set<string>();

  for (const option of options) {
    const ageGroup = resolveUnmatchedCandidateAgeGroup(option);
    if (ageGroup) ageGroups.add(ageGroup);

    const gender = resolveUnmatchedCandidateGenderLabel(option);
    if (gender) genders.add(gender);

    if (option.applicationWeightKg != null) {
      weights.add(option.applicationWeightKg);
    }
    if (option.gymName.trim()) gyms.add(option.gymName);
  }

  return {
    ageGroups: sortAgeGroups([...ageGroups]),
    genders: [...genders].sort((a, b) => a.localeCompare(b, "ko")),
    weights: [...weights].sort((a, b) => a - b),
    gyms: [...gyms].sort((a, b) => a.localeCompare(b, "ko")),
    schoolGrades: buildSchoolGradeFilterOptions(options),
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

  const totalBouts = resolveApprovedOptionTotalBouts(option);
  return matchesFightRecordExperienceFilter(
    totalBouts,
    recordStatus,
    maxTotalBoutsRaw,
  );
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

    if (filters.gyms.length > 0) {
      if (!filters.gyms.includes(option.gymName)) return false;
    }

    if (filters.schoolGrades.length > 0) {
      const grade = resolveApplicationSchoolGradeLabel(option);
      if (!grade || !filters.schoolGrades.includes(grade)) return false;
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
  for (const gym of filters.gyms) chips.push(gym);
  for (const grade of filters.schoolGrades) chips.push(grade);
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
    filters.gyms.length > 0 ||
    filters.schoolGrades.length > 0 ||
    filters.recordStatus !== "all"
  );
}
