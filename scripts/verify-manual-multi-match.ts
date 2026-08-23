/**
 * 수동 복수 출전 SSOT
 *   npm run verify:manual-multi-match
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  buildManualMatchConfirmDescription,
  type ManualMatchPairSide,
} from "../src/lib/brackets/manual-match-pair";

const root = path.resolve(__dirname, "..");

function read(rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function main() {
  const service = read("src/lib/services/bracket.service.ts");
  const validator = read("src/lib/validators/bracket.validator.ts");
  const panel = read("src/components/domain/brackets/ManualMatchCreatePanel.tsx");
  const candidates = read(
    "src/components/domain/brackets/BracketApprovedCandidatesSection.tsx",
  );
  const auto = read("src/lib/services/bracket-auto-match.service.ts");

  assert.match(validator, /allowDuplicateAssignment/);
  assert.match(service, /allowDuplicateAssignment/);
  assert.match(service, /같은 경기구분 그룹에서만 추가 배정/);
  assert.match(service, /allowDuplicateAssignment === true/);
  assert.match(panel, /allowDuplicateAssignment/);
  assert.match(candidates, /복수 경기 선수 추가/);
  assert.match(candidates, /multiMatchMode/);

  // 자동매칭은 placed exclusion 유지
  assert.match(auto, /listPlacedFighterIdsForEvent/);
  assert.doesNotMatch(auto, /allowDuplicateAssignment/);

  const side = (name: string, count: number): ManualMatchPairSide => ({
    fighterId: name,
    fighterName: name,
    gymName: "Gym",
    divisionId: "d1",
    currentDivisionLabel: "고등부",
    applicationWeightKg: 55,
    recordSummary: "3전 2승 1패",
    fighterGender: "male",
    assignmentCount: count,
    assignmentSummary: count > 0 ? "3경기 홍" : undefined,
  });

  const description = buildManualMatchConfirmDescription({
    red: side("강로원", 1),
    blue: side("김철수", 0),
    targetDivisionLabel: "고등부 남성",
    moveFighters: [],
    warnings: [{ label: "동일 체육관" }],
  });
  assert.match(description, /이미 1경기에 배정/);
  assert.match(description, /추가로 이 경기에 배정/);
  assert.match(description, /현재 배정: 1경기/);
  assert.match(description, /동일 체육관/);

  console.log("verify:manual-multi-match OK");
}

main();
