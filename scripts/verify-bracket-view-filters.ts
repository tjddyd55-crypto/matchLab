/**
 * 대진표 보기 필터 — same-corner AND / search / count
 *   npm run verify:bracket-view-filters
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  buildBracketViewFilterOptions,
  DEFAULT_BRACKET_VIEW_FILTERS,
  filterBracketViewMatches,
  formatBracketViewMatchCount,
  hasActiveBracketViewFilters,
  matchesBracketViewFighterFilters,
  type BracketViewFilterState,
} from "../src/lib/brackets/bracket-view-filters";
import type {
  OrganizerEventMatchFighterVM,
  OrganizerEventMatchListItemVM,
} from "../src/lib/services/match.service";
import { BracketMatchStatus, BracketType } from "../src/lib/enums";

const root = path.resolve(__dirname, "..");

function read(rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function fighter(
  partial: Partial<OrganizerEventMatchFighterVM> &
    Pick<OrganizerEventMatchFighterVM, "id" | "name">,
): OrganizerEventMatchFighterVM {
  return {
    fighterCode: partial.fighterCode ?? partial.id,
    gymName: partial.gymName ?? null,
    handicap: null,
    genderLabel: partial.genderLabel ?? null,
    applicationWeightKg: partial.applicationWeightKg ?? null,
    schoolLevel: partial.schoolLevel ?? null,
    schoolGrade: partial.schoolGrade ?? null,
    schoolGradeLabel: partial.schoolGradeLabel ?? null,
    recordSummary: partial.recordSummary ?? "무전",
    ...partial,
  };
}

function match(
  id: string,
  red: OrganizerEventMatchFighterVM | null,
  blue: OrganizerEventMatchFighterVM | null,
  divisionLabel: string,
): OrganizerEventMatchListItemVM {
  return {
    eventTitle: "E",
    matchId: id,
    bracketId: "b1",
    bracketTitle: "G",
    bracketType: BracketType.match_list,
    bracketIsPublic: false,
    matchIsPublicSparring: false,
    division: null,
    divisionLabel,
    roundName: null,
    matchOrder: Number(id.replace(/\D/g, "")) || 0,
    globalMatchOrder: Number(id.replace(/\D/g, "")) || 0,
    matchNumber: Number(id.replace(/\D/g, "")) || null,
    matNumber: null,
    courtId: "c1",
    courtName: "1코트",
    courtOrder: Number(id.replace(/\D/g, "")) || null,
    status: BracketMatchStatus.scheduled,
    fighterRed: red,
    fighterBlue: blue,
    winnerId: null,
    loserId: null,
    resultType: null,
    resultMemo: null,
    isFinishedOps: false,
    hasOfficialResults: false,
  };
}

function main() {
  const helper = read("src/lib/brackets/bracket-view-filters.ts");
  const panel = read(
    "src/components/domain/courts/OrganizerCourtBracketPanel.tsx",
  );
  const toolbar = read(
    "src/components/domain/brackets/BracketViewFilterToolbar.tsx",
  );
  const printPage = read(
    "src/app/(print)/organizer/events/[eventId]/brackets/print/page.tsx",
  );

  assert.match(helper, /matchesBracketViewFighterFilters/);
  assert.match(helper, /filterBracketViewMatches/);
  assert.match(helper, /same-corner AND|same-corner/);
  assert.match(panel, /BracketViewFilterToolbar/);
  assert.match(panel, /filterBracketViewMatches/);
  assert.match(toolbar, /초기화/);
  assert.doesNotMatch(printPage, /BracketViewFilterToolbar/);
  assert.doesNotMatch(printPage, /filterBracketViewMatches/);

  const redA = fighter({
    id: "rA",
    name: "강로원",
    gymName: "T-MAC",
    schoolGradeLabel: "중2",
    schoolLevel: "MIDDLE",
    schoolGrade: 2,
    applicationWeightKg: 55,
    genderLabel: "남성",
    recordSummary: "3전 2승 1패",
  });
  const blueA = fighter({
    id: "bA",
    name: "박준호",
    gymName: "산본",
    schoolGradeLabel: "중3",
    schoolLevel: "MIDDLE",
    schoolGrade: 3,
    applicationWeightKg: 56,
    genderLabel: "남성",
    recordSummary: "4전 2승 2패",
  });
  const redB = fighter({
    id: "rB",
    name: "이민수",
    gymName: "T-MAC",
    schoolGradeLabel: "고1",
    schoolLevel: "HIGH",
    schoolGrade: 1,
    applicationWeightKg: 65,
    genderLabel: "남성",
    recordSummary: "무전",
  });
  const blueB = fighter({
    id: "bB",
    name: "최영훈",
    gymName: "충주",
    schoolGradeLabel: "고1",
    schoolLevel: "HIGH",
    schoolGrade: 1,
    applicationWeightKg: 66,
    genderLabel: "남성",
    recordSummary: "1전 1승 0패",
  });

  const matchA = match("mA", redA, blueA, "중등부 남성");
  const matchB = match("mB", redB, blueB, "고등부 남성");
  // 복수 출전: 강로원 2경기
  const matchC = match(
    "mC",
    redA,
    fighter({
      id: "bC",
      name: "김철수",
      gymName: "산본",
      schoolGradeLabel: "중2",
      applicationWeightKg: 55,
      genderLabel: "남성",
      recordSummary: "2전 1승 1패",
    }),
    "중등부 남성",
  );
  const all = [matchA, matchB, matchC];

  const gymTmac: BracketViewFilterState = {
    ...DEFAULT_BRACKET_VIEW_FILTERS,
    gyms: ["T-MAC"],
  };
  assert.deepEqual(
    filterBracketViewMatches(all, gymTmac).map((m) => m.matchId),
    ["mA", "mB", "mC"],
  );

  const gradeMiddle2: BracketViewFilterState = {
    ...DEFAULT_BRACKET_VIEW_FILTERS,
    schoolGrades: ["중2"],
  };
  assert.deepEqual(
    filterBracketViewMatches(all, gradeMiddle2).map((m) => m.matchId),
    ["mA", "mC"],
  );

  // same-corner AND: T-MAC + 중2 → A,C (B의 T-MAC은 고1)
  const tmacMiddle2: BracketViewFilterState = {
    ...DEFAULT_BRACKET_VIEW_FILTERS,
    gyms: ["T-MAC"],
    schoolGrades: ["중2"],
  };
  assert.deepEqual(
    filterBracketViewMatches(all, tmacMiddle2).map((m) => m.matchId),
    ["mA", "mC"],
  );

  // T-MAC + 중3 → 0 (T-MAC 선수와 중3 선수가 서로 다른 corner)
  const tmacMiddle3: BracketViewFilterState = {
    ...DEFAULT_BRACKET_VIEW_FILTERS,
    gyms: ["T-MAC"],
    schoolGrades: ["중3"],
  };
  assert.equal(filterBracketViewMatches(all, tmacMiddle3).length, 0);

  const weight55: BracketViewFilterState = {
    ...DEFAULT_BRACKET_VIEW_FILTERS,
    weights: [55],
  };
  assert.deepEqual(
    filterBracketViewMatches(all, weight55).map((m) => m.matchId),
    ["mA", "mC"],
  );

  const zeroRecord: BracketViewFilterState = {
    ...DEFAULT_BRACKET_VIEW_FILTERS,
    recordStatus: "zero",
  };
  assert.deepEqual(
    filterBracketViewMatches(all, zeroRecord).map((m) => m.matchId),
    ["mB"],
  );

  const experiencedMax3: BracketViewFilterState = {
    ...DEFAULT_BRACKET_VIEW_FILTERS,
    recordStatus: "experienced",
    maxTotalBouts: "3",
  };
  // A(red 3전), B(blue 1전), C(red 3전 / blue 2전)
  assert.deepEqual(
    filterBracketViewMatches(all, experiencedMax3).map((m) => m.matchId),
    ["mA", "mB", "mC"],
  );

  const experiencedMax1: BracketViewFilterState = {
    ...DEFAULT_BRACKET_VIEW_FILTERS,
    recordStatus: "experienced",
    maxTotalBouts: "1",
  };
  assert.deepEqual(
    filterBracketViewMatches(all, experiencedMax1).map((m) => m.matchId),
    ["mB"],
  );

  // search: 강로원 → A,C (복수 출전 두 Match)
  const searchName: BracketViewFilterState = {
    ...DEFAULT_BRACKET_VIEW_FILTERS,
    search: "강로원",
  };
  assert.deepEqual(
    filterBracketViewMatches(all, searchName).map((m) => m.matchId),
    ["mA", "mC"],
  );

  const searchGym: BracketViewFilterState = {
    ...DEFAULT_BRACKET_VIEW_FILTERS,
    search: "충주",
  };
  assert.deepEqual(
    filterBracketViewMatches(all, searchGym).map((m) => m.matchId),
    ["mB"],
  );

  const searchDivision: BracketViewFilterState = {
    ...DEFAULT_BRACKET_VIEW_FILTERS,
    search: "고등부",
  };
  assert.deepEqual(
    filterBracketViewMatches(all, searchDivision).map((m) => m.matchId),
    ["mB"],
  );

  const opts = buildBracketViewFilterOptions(all);
  assert.ok(opts.gyms.includes("T-MAC"));
  assert.ok(opts.schoolGrades.includes("중2"));
  assert.ok(opts.weights.includes(55));

  assert.equal(
    formatBracketViewMatchCount({
      total: 10,
      visible: 3,
      filtersActive: true,
    }),
    "3 / 10경기",
  );
  assert.equal(
    formatBracketViewMatchCount({
      total: 10,
      visible: 10,
      filtersActive: false,
    }),
    "10경기",
  );

  assert.equal(
    matchesBracketViewFighterFilters(redA, {
      gyms: ["T-MAC"],
      genders: [],
      weights: [],
      schoolGrades: ["중2"],
      recordStatus: "all",
      maxTotalBouts: "",
    }),
    true,
  );
  assert.equal(
    matchesBracketViewFighterFilters(redA, {
      gyms: ["T-MAC"],
      genders: [],
      weights: [],
      schoolGrades: ["중3"],
      recordStatus: "all",
      maxTotalBouts: "",
    }),
    false,
  );

  assert.equal(hasActiveBracketViewFilters(DEFAULT_BRACKET_VIEW_FILTERS), false);
  assert.equal(hasActiveBracketViewFilters(gymTmac), true);

  console.log("verify:bracket-view-filters OK");
}

main();
