/**
 * 경기구분 정규화 SSOT.
 * Excel/직접입력 표현을 EventDivision.ageGroup과 canonical 비교한다.
 * 애매한 값은 추정하지 않는다.
 */

import {
  SCHOOL_LEVEL,
  type SchoolLevel,
} from "@/lib/fighter/record";

export type CanonicalCompetitionCategory =
  | "ELEMENTARY"
  | "MIDDLE"
  | "HIGH"
  | "ADULT"
  | "CUSTOM";

export type NormalizedCompetitionCategory = {
  status: "ok" | "unknown";
  input: string;
  canonical: CanonicalCompetitionCategory | null;
  schoolLevel: SchoolLevel | null;
  schoolGrade: number | null;
  displayLabel: string;
};

const CANONICAL_LABEL: Record<
  Exclude<CanonicalCompetitionCategory, "CUSTOM">,
  string
> = {
  ELEMENTARY: "초등부",
  MIDDLE: "중등부",
  HIGH: "고등부",
  ADULT: "일반부",
};

function foldCategory(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[·•/]/g, "")
    .replace(/\s+/g, "");
}

const ALIAS_TO_CANONICAL: Record<string, CanonicalCompetitionCategory> = {
  초등부: "ELEMENTARY",
  초등: "ELEMENTARY",
  초등학생: "ELEMENTARY",
  초등학교: "ELEMENTARY",
  elementary: "ELEMENTARY",
  u12: "ELEMENTARY",
  중등부: "MIDDLE",
  중등: "MIDDLE",
  중학생: "MIDDLE",
  중학교: "MIDDLE",
  middle: "MIDDLE",
  u14: "MIDDLE",
  고등부: "HIGH",
  고등: "HIGH",
  고등학생: "HIGH",
  고등학교: "HIGH",
  high: "HIGH",
  u16: "HIGH",
  일반부: "ADULT",
  일반: "ADULT",
  성인부: "ADULT",
  성인: "ADULT",
  adult: "ADULT",
  open: "ADULT",
  대학일반부: "ADULT",
};

const GRADE_PATTERNS: Array<{
  re: RegExp;
  canonical: Exclude<CanonicalCompetitionCategory, "CUSTOM">;
  level: SchoolLevel;
}> = [
  {
    re: /^(?:초등(?:부|학생|학교)?|초)\s*([1-6])(?:학년)?$/,
    canonical: "ELEMENTARY",
    level: SCHOOL_LEVEL.ELEMENTARY,
  },
  {
    re: /^(?:중등(?:부|학생|학교)?|중)\s*([1-3])(?:학년)?$/,
    canonical: "MIDDLE",
    level: SCHOOL_LEVEL.MIDDLE,
  },
  {
    re: /^(?:고등(?:부|학생|학교)?|고)\s*([1-3])(?:학년)?$/,
    canonical: "HIGH",
    level: SCHOOL_LEVEL.HIGH,
  },
];

function schoolLevelOf(
  canonical: CanonicalCompetitionCategory,
): SchoolLevel | null {
  if (canonical === "ELEMENTARY") return SCHOOL_LEVEL.ELEMENTARY;
  if (canonical === "MIDDLE") return SCHOOL_LEVEL.MIDDLE;
  if (canonical === "HIGH") return SCHOOL_LEVEL.HIGH;
  if (canonical === "ADULT") return SCHOOL_LEVEL.ADULT;
  return null;
}

function displayFor(
  canonical: CanonicalCompetitionCategory,
  schoolGrade: number | null,
  fallback: string,
): string {
  if (canonical === "CUSTOM") return fallback;
  const base = CANONICAL_LABEL[canonical];
  if (schoolGrade != null) return `${base} ${schoolGrade}학년`;
  return base;
}

export function normalizeCompetitionCategory(
  raw: string | null | undefined,
): NormalizedCompetitionCategory {
  const input = (raw ?? "").trim();
  if (!input) {
    return {
      status: "unknown",
      input,
      canonical: null,
      schoolLevel: null,
      schoolGrade: null,
      displayLabel: "",
    };
  }

  const compact = input.replace(/\s+/g, "");
  for (const { re, canonical, level } of GRADE_PATTERNS) {
    const match = compact.match(re);
    if (!match) continue;
    const schoolGrade = Number.parseInt(match[1]!, 10);
    return {
      status: "ok",
      input,
      canonical,
      schoolLevel: level,
      schoolGrade,
      displayLabel: displayFor(canonical, schoolGrade, input),
    };
  }

  const alias = ALIAS_TO_CANONICAL[foldCategory(input)];
  if (alias && alias !== "CUSTOM") {
    return {
      status: "ok",
      input,
      canonical: alias,
      schoolLevel: schoolLevelOf(alias),
      schoolGrade: null,
      displayLabel: displayFor(alias, null, input),
    };
  }

  return {
    status: "unknown",
    input,
    canonical: "CUSTOM",
    schoolLevel: null,
    schoolGrade: null,
    displayLabel: input,
  };
}

export function canonicalizeEventAgeGroup(
  ageGroup: string | null | undefined,
): NormalizedCompetitionCategory {
  return normalizeCompetitionCategory(ageGroup ?? "");
}

export function eventAgeGroupMatchesInput(
  eventAgeGroup: string | null | undefined,
  input: NormalizedCompetitionCategory,
): boolean {
  const eventNorm = canonicalizeEventAgeGroup(eventAgeGroup);
  if (!eventAgeGroup?.trim() || !input.input) return false;

  const eventFold = foldCategory(eventAgeGroup);
  const inputFold = foldCategory(input.input);
  if (eventFold === inputFold) return true;

  if (input.status === "unknown") return false;
  if (input.canonical === "CUSTOM") return eventFold === inputFold;
  if (eventNorm.status !== "ok" || eventNorm.canonical === "CUSTOM") {
    return false;
  }
  return eventNorm.canonical === input.canonical;
}
