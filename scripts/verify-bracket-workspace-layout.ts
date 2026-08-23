/**
 * 대진표 운영 workspace 1단계 — 모달/2분할/독립필터
 *   npm run verify:bracket-workspace-layout
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildBracketFighterMetaLine,
} from "../src/lib/brackets/bracket-fighter-meta-line";
import {
  DEFAULT_MATCHED_MATCH_FILTERS,
  filterMatchedMatches,
} from "../src/lib/brackets/matched-match-filters";
import {
  DEFAULT_UNMATCHED_QUICK_BAR_FILTERS,
  filterUnmatchedQuickBarOptions,
} from "../src/lib/brackets/unmatched-candidate-filters";

const ROOT = process.cwd();
function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

const generate = read(
  "src/components/domain/brackets/OrganizerBracketsGenerateSection.tsx",
);
assert.ok(generate.includes("OrganizerBracketsGenerateActions"));
assert.ok(generate.includes("대진표 그룹"));
assert.ok(!generate.includes("<AutoBracketGenerationPanel"));
assert.ok(!generate.includes("<BracketCreateForm"));

const actions = read(
  "src/components/domain/brackets/OrganizerBracketsGenerateActions.tsx",
);
assert.ok(actions.includes("자동매칭"));
assert.ok(actions.includes("그룹 생성"));
assert.ok(actions.includes("variant=\"plain\""));
assert.ok(actions.includes("Dialog"));

const editor = read(
  "src/components/domain/brackets/OrganizerBracketEditor.tsx",
);
assert.ok(editor.includes("lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]"));
assert.ok(editor.includes('variant="workspace"'));
assert.ok(editor.includes("compactWorkspace"));

const matchList = read(
  "src/components/domain/brackets/MatchListEditor.tsx",
);
assert.ok(matchList.includes("matchedFilters"));
assert.ok(matchList.includes("MatchedMatchFilterToolbar"));
assert.ok(matchList.includes("조건에 맞는 대진이 없습니다"));

const candidates = read(
  "src/components/domain/brackets/BracketApprovedCandidatesSection.tsx",
);
assert.ok(candidates.includes('variant?: "default" | "workspace"'));
assert.ok(candidates.includes("unmatchedFilters"));

const meta = buildBracketFighterMetaLine({
  fighterGender: "male",
  applicationWeightKg: 55,
  recordSummary: "2승 1패 0무",
  schoolLevel: "MIDDLE",
  schoolGrade: 2,
});
assert.ok(meta?.includes("남성"));
assert.ok(meta?.includes("55kg"));
assert.ok(meta?.includes("중2"));
assert.ok(meta?.includes("승"));
assert.ok(meta?.includes("패"));

const metaNoGrade = buildBracketFighterMetaLine({
  fighterGender: "female",
  applicationWeightKg: 48,
  recordSummary: "0승 0패 0무",
});
assert.ok(metaNoGrade?.includes("여성"));
assert.ok(!metaNoGrade?.includes("초"));
assert.ok(!metaNoGrade?.includes("중"));

const options = [
  {
    applicationId: "a1",
    fighterId: "f1",
    label: "G · A",
    divisionId: "d1",
    divisionLabel: "고등부",
    appliedDivisionLabel: "고등부",
    currentDivisionLabel: "고등부",
    isOtherDivision: false,
    division: {
      sportType: null,
      ruleType: null,
      gender: "male",
      ageGroup: "고등부",
      weightClass: null,
      weightClassName: null,
      weightLimitText: null,
      skillLevel: null,
    },
    fighterName: "홍길동",
    gymName: "T-MAC",
    fighterGender: "male",
    isEligibleForBracket: true,
    eligibilityLabel: "",
    eligibilityReason: "",
    isAssignableForBracket: true,
    assignabilityLabel: "",
    recordSummary: "1승 0패 0무",
    applicationWeightKg: 64,
    schoolLevel: null,
    schoolGrade: null,
  },
] as const;

const matches = [
  {
    id: "m1",
    fighterRedId: "f1",
    fighterBlueId: null,
    fighterRedSnapshot: { name: "홍길동", gymName: "T-MAC" },
    fighterBlueSnapshot: null,
  },
] as never[];

const filteredMatches = filterMatchedMatches(
  matches,
  options as never,
  { ...DEFAULT_MATCHED_MATCH_FILTERS, search: "홍길" },
);
assert.equal(filteredMatches.length, 1);

const unmatched = filterUnmatchedQuickBarOptions(options as never, {
  ...DEFAULT_UNMATCHED_QUICK_BAR_FILTERS,
  gyms: ["다른체육관"],
});
assert.equal(unmatched.length, 0);

const unmatchedKeep = filterUnmatchedQuickBarOptions(options as never, {
  ...DEFAULT_UNMATCHED_QUICK_BAR_FILTERS,
  gyms: ["T-MAC"],
});
assert.equal(unmatchedKeep.length, 1);

console.log("verify:bracket-workspace-layout OK");
