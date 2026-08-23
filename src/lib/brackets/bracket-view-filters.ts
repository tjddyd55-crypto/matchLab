/**
 * 대진표 보기(organizer court view) 읽기 전용 필터 SSOT.
 * Match 저장/자동매칭/수동매칭과 무관. same-corner AND 정책 고정.
 */
import type {
  OrganizerEventMatchFighterVM,
  OrganizerEventMatchListItemVM,
} from "@/lib/services/match.service";
import {
  formatUnmatchedWeightFilterLabel,
  resolveUnmatchedCandidateTotalBouts,
  type UnmatchedRecordStatusFilter,
} from "@/lib/brackets/unmatched-candidate-filters";
import {
  buildSchoolGradeFilterOptions,
  resolveApplicationSchoolGradeLabel,
} from "@/lib/fighter/school-grade-input";

export type BracketViewFilterState = {
  search: string;
  divisions: string[];
  gyms: string[];
  genders: string[];
  weights: number[];
  schoolGrades: string[];
  recordStatus: UnmatchedRecordStatusFilter;
  /** 유전 선택 시만. 빈 문자열 = 상한 없음(1전 이상) */
  maxTotalBouts: string;
};

export const DEFAULT_BRACKET_VIEW_FILTERS: BracketViewFilterState = {
  search: "",
  divisions: [],
  gyms: [],
  genders: [],
  weights: [],
  schoolGrades: [],
  recordStatus: "all",
  maxTotalBouts: "",
};

export type BracketViewFilterOptions = {
  divisions: string[];
  gyms: string[];
  genders: string[];
  weights: number[];
  schoolGrades: string[];
};

export type BracketViewFilterChip = {
  key: string;
  label: string;
};

export type BracketViewFighterFilterFields = {
  gymName: string | null;
  genderLabel: string | null;
  applicationWeightKg: number | null;
  schoolGradeLabel: string | null;
  recordSummary: string;
};

export function hasActiveBracketViewFilters(
  filters: BracketViewFilterState,
): boolean {
  return (
    filters.search.trim().length > 0 ||
    filters.divisions.length > 0 ||
    filters.gyms.length > 0 ||
    filters.genders.length > 0 ||
    filters.weights.length > 0 ||
    filters.schoolGrades.length > 0 ||
    filters.recordStatus !== "all"
  );
}

function resolveFighterFields(
  fighter: OrganizerEventMatchFighterVM | null,
): BracketViewFighterFilterFields | null {
  if (!fighter) return null;
  return {
    gymName: fighter.gymName,
    genderLabel: fighter.genderLabel ?? null,
    applicationWeightKg: fighter.applicationWeightKg ?? null,
    schoolGradeLabel: fighter.schoolGradeLabel ?? null,
    recordSummary: fighter.recordSummary ?? "",
  };
}

function matchesGym(
  fields: BracketViewFighterFilterFields,
  gyms: string[],
): boolean {
  if (gyms.length === 0) return true;
  const gym = fields.gymName?.trim() ?? "";
  return Boolean(gym && gyms.includes(gym));
}

function matchesGender(
  fields: BracketViewFighterFilterFields,
  genders: string[],
): boolean {
  if (genders.length === 0) return true;
  return Boolean(
    fields.genderLabel && genders.includes(fields.genderLabel),
  );
}

function matchesWeight(
  fields: BracketViewFighterFilterFields,
  weights: number[],
): boolean {
  if (weights.length === 0) return true;
  if (fields.applicationWeightKg == null) return false;
  return weights.includes(fields.applicationWeightKg);
}

function matchesSchoolGrade(
  fields: BracketViewFighterFilterFields,
  schoolGrades: string[],
): boolean {
  if (schoolGrades.length === 0) return true;
  return Boolean(
    fields.schoolGradeLabel &&
      schoolGrades.includes(fields.schoolGradeLabel),
  );
}

function matchesRecord(
  fields: BracketViewFighterFilterFields,
  recordStatus: UnmatchedRecordStatusFilter,
  maxTotalBouts: string,
): boolean {
  if (recordStatus === "all") return true;
  const total = resolveUnmatchedCandidateTotalBouts(fields.recordSummary);
  if (total == null) return false;
  if (recordStatus === "zero") return total === 0;
  if (total < 1) return false;
  const maxRaw = maxTotalBouts.trim();
  if (!maxRaw) return true;
  const max = Number.parseInt(maxRaw, 10);
  if (!Number.isFinite(max) || max < 1) return false;
  return total <= max;
}

/**
 * 선수 속성 필터: 한 corner 선수가 모든 조건을 AND로 만족해야 함.
 */
export function matchesBracketViewFighterFilters(
  fighter: OrganizerEventMatchFighterVM | null,
  filters: Pick<
    BracketViewFilterState,
    "gyms" | "genders" | "weights" | "schoolGrades" | "recordStatus" | "maxTotalBouts"
  >,
): boolean {
  const fields = resolveFighterFields(fighter);
  if (!fields) return false;
  if (!matchesGym(fields, filters.gyms)) return false;
  if (!matchesGender(fields, filters.genders)) return false;
  if (!matchesWeight(fields, filters.weights)) return false;
  if (!matchesSchoolGrade(fields, filters.schoolGrades)) return false;
  if (
    !matchesRecord(fields, filters.recordStatus, filters.maxTotalBouts)
  ) {
    return false;
  }
  return true;
}

function hasFighterLevelFilters(filters: BracketViewFilterState): boolean {
  return (
    filters.gyms.length > 0 ||
    filters.genders.length > 0 ||
    filters.weights.length > 0 ||
    filters.schoolGrades.length > 0 ||
    filters.recordStatus !== "all"
  );
}

function matchPassesSearch(
  match: OrganizerEventMatchListItemVM,
  query: string,
): boolean {
  if (!query) return true;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystacks = [
    match.fighterRed?.name,
    match.fighterBlue?.name,
    match.fighterRed?.gymName,
    match.fighterBlue?.gymName,
    match.divisionLabel,
  ];
  return haystacks.some((v) => (v ?? "").toLowerCase().includes(q));
}

function matchPassesDivisionFilter(
  match: OrganizerEventMatchListItemVM,
  divisions: string[],
): boolean {
  if (divisions.length === 0) return true;
  const label = match.divisionLabel?.trim() ?? "";
  return Boolean(label && divisions.includes(label));
}

/**
 * match-level filters AND (redCorner all fighter filters OR blueCorner all fighter filters)
 * 정렬은 호출측이 유지 — 이 함수는 hide/show만.
 */
export function filterBracketViewMatches(
  matches: OrganizerEventMatchListItemVM[],
  filters: BracketViewFilterState,
): OrganizerEventMatchListItemVM[] {
  const q = filters.search.trim();
  const fighterFiltersOn = hasFighterLevelFilters(filters);
  const divisionOn = filters.divisions.length > 0;

  if (!q && !fighterFiltersOn && !divisionOn) return matches;

  return matches.filter((match) => {
    if (!matchPassesSearch(match, q)) return false;
    if (!matchPassesDivisionFilter(match, filters.divisions)) return false;
    if (!fighterFiltersOn) return true;
    return (
      matchesBracketViewFighterFilters(match.fighterRed, filters) ||
      matchesBracketViewFighterFilters(match.fighterBlue, filters)
    );
  });
}

function schoolGradeFieldsFromCompactLabel(label: string): {
  schoolLevel: string | null;
  schoolGrade: number | null;
} {
  const m = label.trim().match(/^(초|중|고)(\d)$/);
  if (!m) return { schoolLevel: null, schoolGrade: null };
  const level =
    m[1] === "초" ? "ELEMENTARY" : m[1] === "중" ? "MIDDLE" : "HIGH";
  return { schoolLevel: level, schoolGrade: Number(m[2]) };
}

export function buildBracketViewFilterOptions(
  matches: OrganizerEventMatchListItemVM[],
): BracketViewFilterOptions {
  const divisions = new Set<string>();
  const gyms = new Set<string>();
  const genders = new Set<string>();
  const weights = new Set<number>();
  const gradeSources: Array<{
    schoolLevel?: string | null;
    schoolGrade?: number | null;
  }> = [];

  for (const match of matches) {
    const div = match.divisionLabel?.trim();
    if (div) divisions.add(div);

    for (const fighter of [match.fighterRed, match.fighterBlue]) {
      if (!fighter) continue;
      const gym = fighter.gymName?.trim();
      if (gym && gym !== "—") gyms.add(gym);
      if (fighter.genderLabel) genders.add(fighter.genderLabel);
      if (fighter.applicationWeightKg != null) {
        weights.add(fighter.applicationWeightKg);
      }
      if (fighter.schoolLevel || fighter.schoolGrade != null) {
        gradeSources.push({
          schoolLevel: fighter.schoolLevel ?? null,
          schoolGrade: fighter.schoolGrade ?? null,
        });
      } else if (fighter.schoolGradeLabel) {
        gradeSources.push(
          schoolGradeFieldsFromCompactLabel(fighter.schoolGradeLabel),
        );
      }
    }
  }

  return {
    divisions: [...divisions].sort((a, b) => a.localeCompare(b, "ko")),
    gyms: [...gyms].sort((a, b) => a.localeCompare(b, "ko")),
    genders: [...genders].sort((a, b) => a.localeCompare(b, "ko")),
    weights: [...weights].sort((a, b) => a - b),
    schoolGrades: buildSchoolGradeFilterOptions(gradeSources),
  };
}

export function buildBracketViewFilterChips(
  filters: BracketViewFilterState,
): BracketViewFilterChip[] {
  const chips: BracketViewFilterChip[] = [];
  const q = filters.search.trim();
  if (q) chips.push({ key: "search", label: `검색: ${q}` });
  for (const d of filters.divisions) {
    chips.push({ key: `division:${d}`, label: d });
  }
  for (const g of filters.gyms) {
    chips.push({ key: `gym:${g}`, label: g });
  }
  for (const g of filters.genders) {
    chips.push({ key: `gender:${g}`, label: g });
  }
  for (const w of filters.weights) {
    chips.push({
      key: `weight:${w}`,
      label: formatUnmatchedWeightFilterLabel(w),
    });
  }
  for (const grade of filters.schoolGrades) {
    chips.push({ key: `grade:${grade}`, label: grade });
  }
  if (filters.recordStatus === "zero") {
    chips.push({ key: "record", label: "무전" });
  } else if (filters.recordStatus === "experienced") {
    const max = filters.maxTotalBouts.trim();
    chips.push({
      key: "record",
      label: max ? `유전 · ${max}전 이하` : "유전",
    });
  }
  return chips;
}

export function removeBracketViewFilterChip(
  filters: BracketViewFilterState,
  chipKey: string,
): BracketViewFilterState {
  if (chipKey === "search") return { ...filters, search: "" };
  if (chipKey === "record") {
    return { ...filters, recordStatus: "all", maxTotalBouts: "" };
  }
  if (chipKey.startsWith("division:")) {
    const v = chipKey.slice("division:".length);
    return {
      ...filters,
      divisions: filters.divisions.filter((d) => d !== v),
    };
  }
  if (chipKey.startsWith("gym:")) {
    const v = chipKey.slice("gym:".length);
    return { ...filters, gyms: filters.gyms.filter((g) => g !== v) };
  }
  if (chipKey.startsWith("gender:")) {
    const v = chipKey.slice("gender:".length);
    return {
      ...filters,
      genders: filters.genders.filter((g) => g !== v),
    };
  }
  if (chipKey.startsWith("weight:")) {
    const v = Number(chipKey.slice("weight:".length));
    return {
      ...filters,
      weights: filters.weights.filter((w) => w !== v),
    };
  }
  if (chipKey.startsWith("grade:")) {
    const v = chipKey.slice("grade:".length);
    return {
      ...filters,
      schoolGrades: filters.schoolGrades.filter((g) => g !== v),
    };
  }
  return filters;
}

export function formatBracketViewMatchCount(input: {
  total: number;
  visible: number;
  filtersActive: boolean;
}): string {
  if (!input.filtersActive) return `${input.total}경기`;
  return `${input.visible} / ${input.total}경기`;
}

/** test/helper: school grade label from application snapshots */
export function resolveBracketViewSchoolGradeLabel(input: {
  schoolLevel?: string | null;
  schoolGrade?: number | null;
}): string | null {
  return resolveApplicationSchoolGradeLabel(input);
}
