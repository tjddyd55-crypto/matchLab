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
assert.ok(editor.includes("lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.15fr)]"));
assert.ok(editor.includes("lg:items-stretch"));
assert.ok(editor.includes('variant="workspace"'));
assert.ok(editor.includes("compactWorkspace"));
assert.ok(editor.includes("미배정"));
assert.ok(!editor.includes("공개 여부는"));
assert.ok(!editor.includes("overflow-x-auto"));

const workspaceUi = read("src/lib/ui/bracket-workspace-ui.ts");
assert.ok(workspaceUi.includes("BRACKET_WORKSPACE_PANE_HEIGHT_CLASS"));
assert.ok(workspaceUi.includes("bracketWorkspaceListScrollClass"));
assert.ok(workspaceUi.includes("lg:h-[min(70vh,720px)]"));

const matchList = read(
  "src/components/domain/brackets/MatchListEditor.tsx",
);
assert.ok(matchList.includes("matchedFilters"));
assert.ok(matchList.includes("MatchedMatchFilterToolbar"));
assert.ok(matchList.includes("조건에 맞는 대진이 없습니다"));
assert.ok(matchList.includes("bracketWorkspacePaneClass"));
assert.ok(matchList.includes("bracketWorkspaceListScrollClass"));
assert.ok(matchList.includes('data-bracket-workspace-list={compactWorkspace ? "matched"'));
assert.ok(matchList.includes('layout={compactWorkspace ? "stack"'));
assert.ok(!matchList.includes("bracketWorkspaceScopeRowClass"));

const candidates = read(
  "src/components/domain/brackets/BracketApprovedCandidatesSection.tsx",
);
assert.ok(candidates.includes('variant?: "default" | "workspace"'));
assert.ok(candidates.includes("unmatchedFilters"));
assert.ok(candidates.includes("bracketWorkspacePaneClass"));
assert.ok(candidates.includes("bracketWorkspaceListScrollClass"));
assert.ok(candidates.includes('data-bracket-workspace-list="unmatched"'));
assert.ok(candidates.includes("bracketWorkspaceActionRowClass"));
assert.ok(candidates.includes("renderUnmatchedScopeButtons"));
assert.ok(
  !/isWorkspace[\s\S]{0,800}미매칭 선수/.test(candidates),
  "workspace unmatched title removed",
);
assert.ok(
  !candidates.includes("검색·필터는 이 영역만 적용됩니다"),
  "workspace description removed",
);
assert.ok(
  !candidates.includes("이 그룹:"),
  "redundant group description removed from unmatched pane",
);
assert.ok(
  !candidates.includes("max-h-[min(70vh,720px)] overflow-y-auto"),
  "filters must not share overflow scroll with player list",
);

const printService = read("src/lib/services/bracket-print.service.ts");
assert.ok(printService.includes("sortMatchesByCourtSchedule"));
assert.ok(printService.includes("formatCourtScheduleMatchOrderShort"));
assert.ok(!printService.includes("sortMatchesByOrder("));

const courtView = read("src/components/domain/courts/OrganizerCourtViewSection.tsx");
assert.ok(courtView.includes("OrganizerBracketPrintActions"));
assert.ok(!courtView.includes("시합 대진표 출력"));

const printActions = read(
  "src/components/domain/brackets/OrganizerBracketPrintActions.tsx",
);
assert.ok(printActions.includes("PDF 다운로드"));
assert.ok(printActions.includes("인쇄"));
assert.ok(printActions.includes("/brackets/print-pdf"));

const unmatchedToolbar = read(
  "src/components/domain/brackets/UnmatchedQuickBarFilterToolbar.tsx",
);
assert.ok(unmatchedToolbar.includes("COMPACT_FILTER_ROW_CLASS"));
assert.ok(unmatchedToolbar.includes('layout?: "toolbar" | "stack"'));

const weightAutoAssign = read(
  "src/components/domain/applications/ApplicationWeightAutoAssign.tsx",
);
assert.ok(weightAutoAssign.includes("formatManualDivisionOptionLabel"));
assert.ok(weightAutoAssign.includes("formatDivisionSearchLabel"));
const toolbarMatches =
  candidates.match(/<UnmatchedQuickBarFilterToolbar\b/g) ?? [];
assert.equal(
  toolbarMatches.length,
  1,
  "미매칭 패널 header에 필터 toolbar 1세트만",
);

const matchedToolbar = read(
  "src/components/domain/brackets/MatchedMatchFilterToolbar.tsx",
);
assert.ok(matchedToolbar.includes("FilterMultiSelectButton"));
assert.ok(matchedToolbar.includes('layout?: "inline" | "stack"'));
assert.ok(matchedToolbar.includes("COMPACT_FILTER_ROW_CLASS"));

// Filter portal (absolute clipping 회귀 방지)
const filterAnchored = read(
  "src/components/domain/brackets/FilterAnchoredDropdown.tsx",
);
assert.ok(filterAnchored.includes("createPortal"));
assert.ok(
  filterAnchored.includes("fixed") || filterAnchored.includes('position: "fixed"'),
);
const viewToolbar = read(
  "src/components/domain/brackets/BracketViewFilterToolbar.tsx",
);
assert.ok(viewToolbar.includes("FilterMultiSelectButton"));

const memoInput = read(
  "src/components/domain/brackets/MatchOrganizerMemoInput.tsx",
);
assert.ok(memoInput.includes('aria-label="경기 운영 메모"'));
assert.ok(!memoInput.includes(">메모<"));

const editControls = read(
  "src/components/domain/brackets/MatchEditControlsRow.tsx",
);
assert.ok(editControls.includes("hideSaveButton"));
assert.ok(editControls.includes("endActions"));
assert.ok(editControls.includes("right={"));

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

const metaAdult = buildBracketFighterMetaLine({
  matchDivisionAgeGroup: "일반부",
  fighterGender: "female",
  applicationWeightKg: 65,
  recordSummary: "2승 1패 0무",
});
assert.ok(metaAdult?.startsWith("일반부"));
assert.ok(metaAdult?.includes("여성"));
assert.ok(metaAdult?.includes("65kg"));

const metaNoGrade = buildBracketFighterMetaLine({
  matchDivisionAgeGroup: "일반부",
  fighterGender: "female",
  applicationWeightKg: 48,
  recordSummary: "0승 0패 0무",
});
assert.ok(metaNoGrade?.includes("일반부"));
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
