/**
 * Bracket 교차 편성이 EventApplication 원 신청 division SSOT를 변경하지 않음.
 *   npm run verify:bracket-original-division-ssot
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildManualMatchConfirmDescription,
  fightersRequiringDivisionMove,
} from "../src/lib/brackets/manual-match-pair";

function main() {
  const service = readFileSync(
    join(process.cwd(), "src/lib/services/bracket.service.ts"),
    "utf8",
  );
  const appRepo = readFileSync(
    join(process.cwd(), "src/lib/repositories/application.repository.ts"),
    "utf8",
  );
  const panel = readFileSync(
    join(
      process.cwd(),
      "src/components/domain/brackets/ManualMatchCreatePanel.tsx",
    ),
    "utf8",
  );
  const lifecycle = readFileSync(
    join(
      process.cwd(),
      "src/lib/services/application-organizer-lifecycle.service.ts",
    ),
    "utf8",
  );

  // crossDivisionManualAssignmentMustNotMutateApplicationDivision
  assert.doesNotMatch(service, /updateApplicationDivisionAssignment/);
  assert.doesNotMatch(service, /ensureAssignedToBracketDivision/);
  assert.match(service, /assertCrossDivisionPlacementAllowed/);
  assert.match(service, /applicationDivisionMutated: false/);
  assert.match(
    service,
    /Bracket assignment path must not mutate application division SSOT|원 신청 SSOT/,
  );

  // removeMustNotMutateApplicationDivision
  const removeIdx = service.indexOf("async removeFighterFromMatch");
  assert.ok(removeIdx > 0);
  const removeBlock = service.slice(removeIdx, removeIdx + 2500);
  assert.doesNotMatch(removeBlock, /eventApplication\.update/);
  assert.doesNotMatch(removeBlock, /updateApplicationDivisionAssignment/);
  assert.match(removeBlock, /fighterRedId: null|fighterBlueId: null/);

  // autoMatchUsesApplicationOriginalDivision — createManualMatch keeps row.divisionId
  assert.match(service, /createManualMatchWithPair/);
  assert.match(service, /toBracketSnapshotSource\(redRow\)/);
  assert.match(service, /toBracketSnapshotSource\(blueRow\)/);

  // deprecated helper remains for non-bracket use but documents ban
  assert.match(appRepo, /@deprecated Bracket 교차 편성에서 사용 금지/);
  assert.match(appRepo, /원 신청 경기구분 SSOT/);

  // UI copy
  assert.match(panel, /교차 편성하여 경기 생성/);
  assert.doesNotMatch(panel, /이동하여 경기 생성/);

  // application edit may still change division (separate flow)
  assert.match(lifecycle, /competitionCategory/);
  assert.match(lifecycle, /divisionId/);

  const desc = buildManualMatchConfirmDescription({
    red: {
      fighterId: "r",
      fighterName: "고등A",
      gymName: "G1",
      divisionId: "high",
      currentDivisionLabel: "고등부 · 남성",
      applicationWeightKg: 60,
      recordSummary: "",
      fighterGender: "male",
    },
    blue: {
      fighterId: "b",
      fighterName: "일반B",
      gymName: "G2",
      divisionId: "open",
      currentDivisionLabel: "일반부 · 남성",
      applicationWeightKg: 62,
      recordSummary: "",
      fighterGender: "male",
    },
    targetDivisionLabel: "일반부 · 남성",
    moveFighters: [
      {
        fighterId: "r",
        fighterName: "고등A",
        gymName: "G1",
        divisionId: "high",
        currentDivisionLabel: "고등부 · 남성",
        applicationWeightKg: 60,
        recordSummary: "",
        fighterGender: "male",
      },
    ],
    warnings: [],
  });
  assert.match(desc, /원 신청 경기구분/);
  assert.match(desc, /변경되지 않습니다/);
  assert.match(desc, /대진에 편성합니다/);

  const movers = fightersRequiringDivisionMove(
    { fighterId: "r", divisionId: "high" },
    { fighterId: "b", divisionId: "open" },
    "open",
  );
  assert.equal(movers.length, 1);
  assert.equal(movers[0]!.fighterId, "r");

  console.log("verify:bracket-original-division-ssot OK");
}

main();
