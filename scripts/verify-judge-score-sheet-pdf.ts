/**
 * Judge score sheet PDF — static verifies (read-only, SSOT, page math).
 *   npx tsx scripts/verify-judge-score-sheet-pdf.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildJudgeScoreSheetFilename,
  buildJudgeScoreSheetPages,
  buildJudgeScoreSheetRoundLabels,
  isJudgeScoreSheetEligibleMatch,
  parseJudgeScoreSheetJudgesParam,
} from "../src/lib/judge-score-sheet/format";
import type { JudgeScoreSheetMatchDto } from "../src/lib/judge-score-sheet/types";

const root = process.cwd();

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

function sampleMatch(
  patch: Partial<JudgeScoreSheetMatchDto> & { matchId: string },
): JudgeScoreSheetMatchDto {
  return {
    matchNumber: 1,
    matchNoLabel: "1경기",
    venueName: "1경기장",
    venueId: "court1",
    divisionLabel: "초등부 · 남성 · 킥복싱 · -35kg",
    roundCount: 3,
    red: { name: "홍길동", gymName: "테스트체육관" },
    blue: { name: "김철수", gymName: "블루짐" },
    ...patch,
  };
}

function assertReadOnly() {
  const service = read("src/lib/services/judge-score-sheet.service.ts");
  const route = read(
    "src/app/api/organizer/events/[eventId]/judge-score-sheet-pdf/route.ts",
  );
  assert.match(service, /READ ONLY/);
  assert.doesNotMatch(service, /bracketService\.ensure/);
  assert.doesNotMatch(service, /applyEventWideMatchNumberResequence/);
  assert.doesNotMatch(service, /\.update\(/);
  assert.doesNotMatch(service, /updateMany/);
  assert.doesNotMatch(service, /fighter\.update/i);
  assert.doesNotMatch(service, /eventApplication/i);
  assert.doesNotMatch(service, /matchResult/i);
  assert.doesNotMatch(route, /\.update\(/);
  assert.doesNotMatch(route, /prisma\.\$transaction/);
  console.log("verify:judge-score-sheet-read-only: OK");
}

function assertSsotComments() {
  const types = read("src/lib/judge-score-sheet/types.ts");
  assert.match(types, /Match Number SSOT/);
  assert.match(types, /Venue SSOT/);
  assert.match(types, /RED SSOT/);
  assert.match(types, /BLUE SSOT/);
  assert.match(types, /Division SSOT/);

  const service = read("src/lib/services/judge-score-sheet.service.ts");
  assert.match(service, /parseBracketFighterSnapshot/);
  assert.match(service, /formatDivisionMainLabel/);
  assert.match(service, /sortMatchesByCourtSchedule/);
  assert.match(service, /formatCourtScheduleMatchOrderShort/);
  console.log("verify:judge-score-sheet-ssot: OK");
}

function assertEligibility() {
  assert.equal(
    isJudgeScoreSheetEligibleMatch({
      status: "waiting",
      fighterRedId: "a",
      fighterBlueId: "b",
    }),
    true,
  );
  assert.equal(
    isJudgeScoreSheetEligibleMatch({
      status: "cancelled",
      fighterRedId: "a",
      fighterBlueId: "b",
    }),
    false,
  );
  assert.equal(
    isJudgeScoreSheetEligibleMatch({
      status: "waiting",
      fighterRedId: "a",
      fighterBlueId: null,
    }),
    false,
  );
  assert.equal(
    isJudgeScoreSheetEligibleMatch({
      status: "waiting",
      fighterRedId: null,
      fighterBlueId: null,
    }),
    false,
  );
  console.log("verify:judge-score-sheet-eligibility: OK");
}

function assertPageMath() {
  const matches = [
    sampleMatch({ matchId: "m1", matchNumber: 1, matchNoLabel: "1경기" }),
    sampleMatch({ matchId: "m2", matchNumber: 7, matchNoLabel: "7경기" }),
  ];
  const pages1 = buildJudgeScoreSheetPages(matches, [1]);
  assert.equal(pages1.length, 2);
  assert.equal(pages1[0]?.judgeNumber, 1);
  assert.equal(pages1[0]?.match.matchNoLabel, "1경기");
  assert.equal(pages1[1]?.match.matchNoLabel, "7경기");

  const pagesAll = buildJudgeScoreSheetPages(matches, [1, 2, 3]);
  assert.equal(pagesAll.length, 6);
  assert.equal(pagesAll[0]?.judgeNumber, 1);
  assert.equal(pagesAll[2]?.judgeNumber, 2);
  assert.equal(pagesAll[4]?.judgeNumber, 3);
  // filter must not renumber
  assert.equal(pagesAll[1]?.match.matchNumber, 7);

  assert.deepEqual(parseJudgeScoreSheetJudgesParam("2"), [2]);
  assert.deepEqual(parseJudgeScoreSheetJudgesParam("1,3"), [1, 3]);
  assert.deepEqual(parseJudgeScoreSheetJudgesParam(null), [1, 2, 3]);

  assert.deepEqual(buildJudgeScoreSheetRoundLabels(3), [
    "1R",
    "2R",
    "3R",
    "합계",
  ]);
  assert.deepEqual(buildJudgeScoreSheetRoundLabels(2), ["1R", "2R", "합계"]);

  assert.match(
    buildJudgeScoreSheetFilename({
      eventName: "제12회 마포구청장배",
      judges: [1],
    }),
    /1심판_채점표\.pdf$/,
  );
  assert.match(
    buildJudgeScoreSheetFilename({
      eventName: "제12회 마포구청장배",
      judges: [1, 2, 3],
    }),
    /심판채점표_전체\.pdf$/,
  );
  console.log("verify:judge-score-sheet-page-math: OK");
}

function assertUiAndRoutes() {
  const actions = read(
    "src/components/domain/judge-score-sheet/OrganizerJudgeScoreSheetActions.tsx",
  );
  const allMatches = read(
    "src/components/domain/brackets/OrganizerAllMatchesWorkspaceClient.tsx",
  );
  const courtView = read(
    "src/components/domain/courts/OrganizerCourtViewSection.tsx",
  );
  const printPage = read(
    "src/app/(print)/organizer/events/[eventId]/judge-score-sheet/page.tsx",
  );
  const css = read(
    "src/components/domain/judge-score-sheet/judge-score-sheet-print.css",
  );
  assert.match(actions, /심판 채점표/);
  assert.match(actions, /judge-score-sheet-pdf/);
  assert.match(allMatches, /OrganizerJudgeScoreSheetActions/);
  assert.match(courtView, /OrganizerJudgeScoreSheetActions/);
  assert.match(printPage, /JudgeScoreSheetDocumentView/);
  assert.match(css, /Noto Sans KR/);
  assert.match(css, /page-break-after:\s*always/);
  assert.match(css, /size:\s*A4 portrait/);
  console.log("verify:judge-score-sheet-ui-routes: OK");
}

function assertNoVenueInvention() {
  const doc = read(
    "src/components/domain/judge-score-sheet/JudgeScoreSheetDocument.tsx",
  );
  assert.match(doc, />장소</);
  assert.doesNotMatch(doc, /코트/);
  assert.doesNotMatch(doc, /1코트/);
  console.log("verify:judge-score-sheet-venue-label: OK");
}

assertReadOnly();
assertSsotComments();
assertEligibility();
assertPageMath();
assertUiAndRoutes();
assertNoVenueInvention();

console.log("verify:judge-score-sheet-pdf: ALL OK");
