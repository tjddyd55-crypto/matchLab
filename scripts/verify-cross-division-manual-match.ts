/**
 * 교차 경기구분 수동 편성 SSOT
 *   npm run verify:cross-division-manual-match
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildCrossDivisionManualMatchDescription,
  buildManualPairWarnings,
  fightersRequiringDivisionMove,
} from "../src/lib/brackets/manual-match-pair";

function main() {
  const service = readFileSync(
    join(process.cwd(), "src/lib/services/bracket.service.ts"),
    "utf8",
  );
  const repo = readFileSync(
    join(process.cwd(), "src/lib/repositories/bracket.repository.ts"),
    "utf8",
  );
  const section = readFileSync(
    join(
      process.cwd(),
      "src/components/domain/brackets/BracketApprovedCandidatesSection.tsx",
    ),
    "utf8",
  );
  const panel = readFileSync(
    join(
      process.cwd(),
      "src/components/domain/brackets/ManualMatchCreatePanel.tsx",
    ),
    "utf8",
  );

  assert.match(service, /eventWideUnmatchedOptions/);
  assert.match(service, /findApprovedApplicationForEventPlacement/);
  assert.match(service, /countFighterAssignmentsInEvent/);
  assert.match(service, /updateApplicationDivisionAssignment/);
  assert.match(service, /ensureAssignedToBracketDivision/);
  assert.match(service, /cross_division_manual_match/);

  assert.match(repo, /findApprovedApplicationForEventPlacement/);
  assert.match(repo, /countFighterAssignmentsInEvent/);

  assert.match(section, /전체 미매칭/);
  assert.match(section, /현재 경기구분/);
  assert.match(section, /eventWideUnmatchedOptions/);
  assert.match(section, /다른 경기구분/);

  assert.match(panel, /다른 경기구분 선수와 매칭할까요/);
  assert.match(panel, /이동하여 경기 생성/);
  assert.match(panel, /buildManualMatchConfirmDescription/);

  const move = fightersRequiringDivisionMove(
    { fighterId: "a", divisionId: "div-a" },
    { fighterId: "b", divisionId: "div-b" },
    "div-target",
  );
  assert.equal(move.length, 2);

  const warnings = buildManualPairWarnings({
    red: {
      fighterId: "a",
      fighterName: "A",
      gymName: "G1",
      divisionId: "div-a",
      currentDivisionLabel: "고등부 · 남성",
      applicationWeightKg: 68.2,
      recordSummary: "3전 2승 1패",
      fighterGender: "male",
    },
    blue: {
      fighterId: "b",
      fighterName: "B",
      gymName: "G2",
      divisionId: "div-b",
      currentDivisionLabel: "일반부 · 남성",
      applicationWeightKg: 70.1,
      recordSummary: "6전 3승 3패",
      fighterGender: "male",
    },
    targetDivisionId: "div-target",
    targetDivisionLabel: "고등부 · 남성",
    targetDivisionGender: "male",
  });
  assert.ok(warnings.some((w) => w.label.includes("경기구분 다름")));
  assert.ok(warnings.some((w) => w.label.includes("체중 차이")));

  const desc = buildCrossDivisionManualMatchDescription({
    red: {
      fighterId: "a",
      fighterName: "김철수",
      gymName: "G1",
      divisionId: "div-a",
      currentDivisionLabel: "고등부 · 남성",
      applicationWeightKg: 68.2,
      recordSummary: "",
      fighterGender: "male",
    },
    blue: {
      fighterId: "b",
      fighterName: "박영수",
      gymName: "G2",
      divisionId: "div-b",
      currentDivisionLabel: "일반부 · 남성",
      applicationWeightKg: 70.1,
      recordSummary: "",
      fighterGender: "male",
    },
    targetDivisionLabel: "고등부 · 남성",
    moveFighters: [
      {
        fighterId: "b",
        fighterName: "박영수",
        gymName: "G2",
        divisionId: "div-b",
        currentDivisionLabel: "일반부 · 남성",
        applicationWeightKg: 70.1,
        recordSummary: "",
        fighterGender: "male",
      },
    ],
    warnings,
  });
  assert.match(desc, /원래 신청정보는 변경되지 않습니다/);
  assert.match(desc, /일반부 · 남성/);
  assert.match(desc, /68\.2kg/);
  assert.match(desc, /전적 정보 없음/);
  assert.match(desc, /70\.1kg/);

  console.log("verify:cross-division-manual-match OK");
}

main();
