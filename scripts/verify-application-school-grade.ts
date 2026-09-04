/**
 * 학년 SSOT — select → schoolLevel/schoolGrade, filter, sort, snapshot priority
 *   npm run verify:application-school-grade
 */
import assert from "node:assert/strict";
import { formatSchoolGradeCompactLabel } from "../src/lib/fighter/record";
import { buildBracketFighterMetaLine } from "../src/lib/brackets/bracket-fighter-meta-line";
import {
  buildSchoolGradeFilterOptions,
  parseSchoolGradeSelectValue,
  resolveApplicationSchoolGradeLabel,
  resolveExcelSchoolGradeFields,
  resolveGymApplySchoolGradeSnapshot,
  schoolGradeSelectValueFromFields,
  sortSchoolGradeCompactLabels,
} from "../src/lib/fighter/school-grade-input";
import {
  DEFAULT_MATCHED_MATCH_FILTERS,
  filterMatchedMatches,
} from "../src/lib/brackets/matched-match-filters";
import {
  DEFAULT_UNMATCHED_QUICK_BAR_FILTERS,
  filterUnmatchedQuickBarOptions,
} from "../src/lib/brackets/unmatched-candidate-filters";
import type { OrganizerApprovedFighterOptionVM } from "../src/lib/services/bracket.service";
import type { OrganizerBracketMatchVM } from "../src/lib/services/bracket.service";

function assertParse(
  raw: string,
  expected: { level: string | null; grade: number | null },
) {
  const parsed = parseSchoolGradeSelectValue(raw);
  assert.equal(parsed.ok, true, `expected ok for ${raw}`);
  if (!parsed.ok) return;
  assert.equal(parsed.fields.schoolLevel, expected.level);
  assert.equal(parsed.fields.schoolGrade, expected.grade);
}

function fixtureOption(input: {
  id: string;
  name: string;
  schoolLevel?: string | null;
  schoolGrade?: number | null;
}): OrganizerApprovedFighterOptionVM {
  return {
    applicationId: input.id,
    fighterId: input.id,
    label: input.name,
    divisionId: "div-1",
    divisionLabel: "중등부 · 남성",
    appliedDivisionLabel: "중등부 · 남성",
    currentDivisionLabel: "중등부 · 남성",
    isOtherDivision: false,
    division: {
      sportType: null,
      ruleType: null,
      gender: "male",
      ageGroup: "중등부",
      weightClass: null,
      weightClassName: null,
      weightLimitText: null,
      skillLevel: null,
    },
    fighterName: input.name,
    gymName: "Gym",
    fighterGender: "male",
    isEligibleForBracket: true,
    eligibilityLabel: "",
    eligibilityReason: "",
    isAssignableForBracket: true,
    assignabilityLabel: "",
    recordSummary: "1승 0패 0무",
    applicationWeightKg: 55,
    schoolLevel: input.schoolLevel ?? null,
    schoolGrade: input.schoolGrade ?? null,
  };
}

function fixtureMatch(
  id: string,
  redId: string | null,
  blueId: string | null,
): OrganizerBracketMatchVM {
  return {
    id,
    round: 1,
    roundName: null,
    matchOrder: 1,
    globalMatchOrder: 1,
    matchNumber: 1,
    matNumber: null,
    courtId: null,
    courtOrder: null,
    courtName: null,
    fighterRedId: redId,
    fighterBlueId: blueId,
    fighterRedSnapshot: null,
    fighterBlueSnapshot: null,
    nextMatchId: null,
    nextMatchSlot: null,
    status: "scheduled",
    winnerId: null,
    loserId: null,
    resultType: null,
    resultMemo: null,
    organizerMemo: null,
    hasOfficialResults: false,
  } as OrganizerBracketMatchVM;
}

function main() {
  // null / empty
  assertParse("", { level: null, grade: null });
  assert.equal(parseSchoolGradeSelectValue(null).ok, true);

  // compact labels
  assertParse("초1", { level: "ELEMENTARY", grade: 1 });
  assertParse("초6", { level: "ELEMENTARY", grade: 6 });
  assertParse("중1", { level: "MIDDLE", grade: 1 });
  assertParse("중3", { level: "MIDDLE", grade: 3 });
  assertParse("고1", { level: "HIGH", grade: 1 });
  assertParse("고3", { level: "HIGH", grade: 3 });
  assertParse("대학생", { level: "UNIVERSITY", grade: null });
  assertParse("성인", { level: "ADULT", grade: null });

  // invalid reject
  for (const bad of ["중 2", "중학교2", "2학년", "abc", "초7", "중4"]) {
    const parsed = parseSchoolGradeSelectValue(bad);
    assert.equal(parsed.ok, false, `expected reject for ${bad}`);
  }

  // formatter
  assert.equal(
    formatSchoolGradeCompactLabel({
      schoolLevel: "ELEMENTARY",
      schoolGrade: 5,
    }),
    "초5",
  );
  assert.equal(
    formatSchoolGradeCompactLabel({ schoolLevel: "MIDDLE", schoolGrade: 2 }),
    "중2",
  );
  assert.equal(
    formatSchoolGradeCompactLabel({ schoolLevel: "HIGH", schoolGrade: 2 }),
    "고2",
  );
  assert.equal(
    formatSchoolGradeCompactLabel({
      schoolLevel: "UNIVERSITY",
      schoolGrade: null,
    }),
    "대학생",
  );
  assert.equal(
    formatSchoolGradeCompactLabel({ schoolLevel: "ADULT", schoolGrade: null }),
    "성인",
  );
  assert.equal(
    formatSchoolGradeCompactLabel({ schoolLevel: null, schoolGrade: null }),
    null,
  );

  // sort order
  assert.deepEqual(
    sortSchoolGradeCompactLabels(["고1", "초2", "중3", "초1", "중1"]),
    ["초1", "초2", "중1", "중3", "고1"],
  );

  // select value round-trip
  assert.equal(
    schoolGradeSelectValueFromFields({
      schoolLevel: "MIDDLE",
      schoolGrade: 2,
    }),
    "중2",
  );
  assert.equal(
    schoolGradeSelectValueFromFields({
      schoolLevel: "ADULT",
      schoolGrade: null,
    }),
    "성인",
  );
  assert.equal(
    schoolGradeSelectValueFromFields({
      schoolLevel: "UNIVERSITY",
      schoolGrade: null,
    }),
    "대학생",
  );

  // Excel: missing column → category fallback
  const excelMissing = resolveExcelSchoolGradeFields({
    hasGradeColumn: false,
    gradeCell: "",
    categorySchoolLevel: "ELEMENTARY",
    categorySchoolGrade: 3,
  });
  assert.equal(excelMissing.ok, true);
  if (excelMissing.ok) {
    assert.equal(excelMissing.fields.schoolLevel, "ELEMENTARY");
    assert.equal(excelMissing.fields.schoolGrade, 3);
  }

  // Excel: present blank → null
  const excelBlank = resolveExcelSchoolGradeFields({
    hasGradeColumn: true,
    gradeCell: "",
    categorySchoolLevel: "ELEMENTARY",
    categorySchoolGrade: 3,
  });
  assert.equal(excelBlank.ok, true);
  if (excelBlank.ok) {
    assert.equal(excelBlank.fields.schoolLevel, null);
    assert.equal(excelBlank.fields.schoolGrade, null);
  }

  // Excel: invalid
  const excelBad = resolveExcelSchoolGradeFields({
    hasGradeColumn: true,
    gradeCell: "중학교 2학년",
    categorySchoolLevel: null,
    categorySchoolGrade: null,
  });
  assert.equal(excelBad.ok, false);

  // gym apply: select overrides fighter
  const gymOverride = resolveGymApplySchoolGradeSnapshot({
    schoolGradeSelect: "고1",
    fighterSchoolLevel: "MIDDLE",
    fighterSchoolGrade: 2,
    categorySchoolLevel: "HIGH",
    categorySchoolGrade: null,
  });
  assert.equal(gymOverride.ok, true);
  if (gymOverride.ok) {
    assert.equal(gymOverride.fields.schoolLevel, "HIGH");
    assert.equal(gymOverride.fields.schoolGrade, 1);
  }

  // filter options distinct + sort
  const options = [
    fixtureOption({
      id: "a",
      name: "A",
      schoolLevel: "MIDDLE",
      schoolGrade: 2,
    }),
    fixtureOption({
      id: "b",
      name: "B",
      schoolLevel: "HIGH",
      schoolGrade: 1,
    }),
    fixtureOption({
      id: "c",
      name: "C",
      schoolLevel: "MIDDLE",
      schoolGrade: 2,
    }),
    fixtureOption({ id: "d", name: "D" }),
  ];
  assert.deepEqual(buildSchoolGradeFilterOptions(options), ["중2", "고1"]);
  assert.equal(resolveApplicationSchoolGradeLabel(options[0]!), "중2");
  assert.equal(resolveApplicationSchoolGradeLabel(options[3]!), null);

  // bracket meta line — grade segment from snapshot fields only
  assert.equal(
    buildBracketFighterMetaLine({
      fighterGender: "male",
      applicationWeightKg: 45,
      schoolLevel: "ELEMENTARY",
      schoolGrade: 5,
      recordSummary: "0승 0패 0무",
    }),
    "남성 · 45kg · 초5 · 무전",
  );
  assert.equal(
    buildBracketFighterMetaLine({
      fighterGender: "male",
      applicationWeightKg: 60,
      schoolLevel: "HIGH",
      schoolGrade: 2,
      recordSummary: "0승 0패 0무",
    }),
    "남성 · 60kg · 고2 · 무전",
  );
  assert.equal(
    buildBracketFighterMetaLine({
      fighterGender: "male",
      applicationWeightKg: 70,
      schoolLevel: "UNIVERSITY",
      schoolGrade: null,
      recordSummary: "0승 0패 0무",
    }),
    "남성 · 70kg · 대학생 · 무전",
  );
  assert.equal(
    buildBracketFighterMetaLine({
      fighterGender: "male",
      applicationWeightKg: 80,
      schoolLevel: "ADULT",
      schoolGrade: null,
      recordSummary: "0승 0패 0무",
    }),
    "남성 · 80kg · 성인 · 무전",
  );
  assert.equal(
    buildBracketFighterMetaLine({
      fighterGender: "male",
      applicationWeightKg: 55,
      schoolLevel: null,
      schoolGrade: null,
      recordSummary: "0승 0패 0무",
    }),
    "남성 · 55kg · 무전",
  );

  // unmatched filter
  const unmatched = filterUnmatchedQuickBarOptions(options, {
    ...DEFAULT_UNMATCHED_QUICK_BAR_FILTERS,
    schoolGrades: ["고1"],
  });
  assert.deepEqual(
    unmatched.map((o) => o.fighterId),
    ["b"],
  );

  // matched filter independent
  const matches = [
    fixtureMatch("m1", "a", "b"),
    fixtureMatch("m2", "c", "d"),
  ];
  const matchedOnlyMiddle = filterMatchedMatches(matches, options, {
    ...DEFAULT_MATCHED_MATCH_FILTERS,
    schoolGrades: ["중2"],
  });
  assert.deepEqual(
    matchedOnlyMiddle.map((m) => m.id),
    ["m1", "m2"],
  );
  const matchedOnlyHigh = filterMatchedMatches(matches, options, {
    ...DEFAULT_MATCHED_MATCH_FILTERS,
    schoolGrades: ["고1"],
  });
  assert.deepEqual(
    matchedOnlyHigh.map((m) => m.id),
    ["m1"],
  );

  console.log("verify:application-school-grade OK");
}

main();
