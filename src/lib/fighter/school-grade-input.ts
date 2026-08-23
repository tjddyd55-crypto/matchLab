/**
 * 학년 입력/필터 SSOT.
 * UI는 compact label 하나(초1~고3), 저장은 schoolLevel + schoolGrade.
 * formatSchoolGradeCompactLabel 재사용 — UI에서 직접 문자열 조합 금지.
 */

import {
  SCHOOL_LEVEL,
  formatSchoolGradeCompactLabel,
  type SchoolLevel,
  type StructuredGrade,
} from "@/lib/fighter/record";

/** dropdown value = compact label. 빈 문자열 = 선택 안 함 */
export const SCHOOL_GRADE_SELECT_OPTIONS = [
  "초1",
  "초2",
  "초3",
  "초4",
  "초5",
  "초6",
  "중1",
  "중2",
  "중3",
  "고1",
  "고2",
  "고3",
] as const;

export type SchoolGradeSelectOption =
  (typeof SCHOOL_GRADE_SELECT_OPTIONS)[number];

const SELECT_SET = new Set<string>(SCHOOL_GRADE_SELECT_OPTIONS);

const SORT_RANK: Record<SchoolGradeSelectOption, number> = {
  초1: 1,
  초2: 2,
  초3: 3,
  초4: 4,
  초5: 5,
  초6: 6,
  중1: 7,
  중2: 8,
  중3: 9,
  고1: 10,
  고2: 11,
  고3: 12,
};

export type SchoolGradeFields = {
  schoolLevel: SchoolLevel | null;
  schoolGrade: number | null;
};

export type SchoolGradeSelectParseResult =
  | { ok: true; fields: SchoolGradeFields; selectValue: string }
  | { ok: false; error: string };

/**
 * Strict parse — 공백/별칭/자유문 거부.
 * "" / null / undefined → 선택 안 함 (null, null).
 */
export function parseSchoolGradeSelectValue(
  raw: string | null | undefined,
): SchoolGradeSelectParseResult {
  if (raw == null) {
    return {
      ok: true,
      fields: { schoolLevel: null, schoolGrade: null },
      selectValue: "",
    };
  }
  const s = raw.trim();
  if (!s) {
    return {
      ok: true,
      fields: { schoolLevel: null, schoolGrade: null },
      selectValue: "",
    };
  }
  if (!SELECT_SET.has(s)) {
    return {
      ok: false,
      error: `학년 형식이 올바르지 않습니다: "${s}" (예: 초3, 중2, 고1)`,
    };
  }
  const prefix = s[0]!;
  const grade = Number.parseInt(s.slice(1), 10);
  if (prefix === "초") {
    return {
      ok: true,
      fields: {
        schoolLevel: SCHOOL_LEVEL.ELEMENTARY,
        schoolGrade: grade,
      },
      selectValue: s,
    };
  }
  if (prefix === "중") {
    return {
      ok: true,
      fields: {
        schoolLevel: SCHOOL_LEVEL.MIDDLE,
        schoolGrade: grade,
      },
      selectValue: s,
    };
  }
  return {
    ok: true,
    fields: {
      schoolLevel: SCHOOL_LEVEL.HIGH,
      schoolGrade: grade,
    },
    selectValue: s,
  };
}

/** edit form default — snapshot/fields → compact select value */
export function schoolGradeSelectValueFromFields(input: {
  schoolLevel?: string | null;
  schoolGrade?: number | null;
}): string {
  const label = formatSchoolGradeCompactLabel({
    schoolLevel: input.schoolLevel,
    schoolGrade: input.schoolGrade,
  });
  if (!label || label === "성인") return "";
  return SELECT_SET.has(label) ? label : "";
}

export function schoolGradeCompactSortRank(label: string): number {
  if (label in SORT_RANK) {
    return SORT_RANK[label as SchoolGradeSelectOption];
  }
  return Number.MAX_SAFE_INTEGER;
}

export function sortSchoolGradeCompactLabels(labels: string[]): string[] {
  return [...labels].sort((a, b) => {
    const ra = schoolGradeCompactSortRank(a);
    const rb = schoolGradeCompactSortRank(b);
    if (ra !== rb) return ra - rb;
    return a.localeCompare(b, "ko");
  });
}

/**
 * 신청/선수 snapshot 우선 표시 라벨.
 * ADULT → null (필터/메타에서 성인 라벨 생략 — 학년 없음과 동일 취급).
 */
export function resolveApplicationSchoolGradeLabel(input: {
  schoolLevel?: string | null;
  schoolGrade?: number | null;
}): string | null {
  const label = formatSchoolGradeCompactLabel({
    schoolLevel: input.schoolLevel,
    schoolGrade: input.schoolGrade,
  });
  if (!label || label === "성인") return null;
  return label;
}

export function buildSchoolGradeFilterOptions(
  sources: Array<{
    schoolLevel?: string | null;
    schoolGrade?: number | null;
  }>,
): string[] {
  const set = new Set<string>();
  for (const source of sources) {
    const label = resolveApplicationSchoolGradeLabel(source);
    if (label) set.add(label);
  }
  return sortSchoolGradeCompactLabels([...set]);
}

/** Excel/레거시 호환 — category 기반 StructuredGrade → fields */
export function structuredGradeToFields(
  grade: StructuredGrade | null | undefined,
): SchoolGradeFields {
  if (!grade) return { schoolLevel: null, schoolGrade: null };
  if (grade.schoolLevel === SCHOOL_LEVEL.ADULT) {
    return { schoolLevel: null, schoolGrade: null };
  }
  return {
    schoolLevel: grade.schoolLevel,
    schoolGrade: grade.schoolGrade,
  };
}

/**
 * Excel 학년 컬럼 해석.
 * - 컬럼 없음: category fallback (backward compat)
 * - 컬럼 있음·빈값: null
 * - 컬럼 있음·값: strict compact only
 */
export function resolveExcelSchoolGradeFields(input: {
  hasGradeColumn: boolean;
  gradeCell: string | null | undefined;
  categorySchoolLevel: string | null;
  categorySchoolGrade: number | null;
}): SchoolGradeSelectParseResult | { ok: true; fields: SchoolGradeFields } {
  if (!input.hasGradeColumn) {
    const level = input.categorySchoolLevel;
    if (!level || level === SCHOOL_LEVEL.ADULT) {
      return { ok: true, fields: { schoolLevel: null, schoolGrade: null } };
    }
    return {
      ok: true,
      fields: {
        schoolLevel: level as SchoolLevel,
        schoolGrade: input.categorySchoolGrade,
      },
    };
  }
  return parseSchoolGradeSelectValue(input.gradeCell);
}

/**
 * 체육관 신청(기존 Fighter) — select 있으면 우선, 없으면 Fighter → category.
 * select가 명시적으로 비어 있어도 Fighter/category fallback 유지(기존 호환).
 */
export function resolveGymApplySchoolGradeSnapshot(input: {
  schoolGradeSelect?: string | null;
  fighterSchoolLevel?: string | null;
  fighterSchoolGrade?: number | null;
  categorySchoolLevel?: string | null;
  categorySchoolGrade?: number | null;
}): SchoolGradeSelectParseResult {
  const parsed = parseSchoolGradeSelectValue(input.schoolGradeSelect);
  if (!parsed.ok) return parsed;
  if (parsed.selectValue) return parsed;

  const fighterLevel = input.fighterSchoolLevel?.trim() || null;
  if (fighterLevel && fighterLevel !== SCHOOL_LEVEL.ADULT) {
    return {
      ok: true,
      fields: {
        schoolLevel: fighterLevel as SchoolLevel,
        schoolGrade: input.fighterSchoolGrade ?? null,
      },
      selectValue: "",
    };
  }

  const categoryLevel = input.categorySchoolLevel?.trim() || null;
  if (categoryLevel && categoryLevel !== SCHOOL_LEVEL.ADULT) {
    return {
      ok: true,
      fields: {
        schoolLevel: categoryLevel as SchoolLevel,
        schoolGrade: input.categorySchoolGrade ?? null,
      },
      selectValue: "",
    };
  }

  return {
    ok: true,
    fields: { schoolLevel: null, schoolGrade: null },
    selectValue: "",
  };
}
