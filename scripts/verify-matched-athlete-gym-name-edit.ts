/**
 * Matched athlete profile edit — BracketMatch snapshot resync SSOT.
 *   npm run verify:matched-athlete-gym-name-edit
 */
import assert from "node:assert/strict";
import {
  buildFighterBracketSnapshot,
  type BracketFighterSnapshotSource,
} from "../src/lib/bracket-snapshot.ts";

function sourceWithGym(gymName: string): BracketFighterSnapshotSource {
  return {
    fighter: {
      id: "f1",
      fighterCode: "F001",
      name: "QA 선수A",
      profileImageUrl: null,
      recordWin: 1,
      recordLoss: 0,
      recordDraw: 0,
      recordTotalBouts: 1,
    },
    gym: null,
    gymNameSnapshot: gymName,
    gymSnapshot: { name: gymName },
    division: {
      sportType: "bjj",
      ruleType: null,
      gender: "male",
      ageGroup: "middle",
      weightClass: "-60",
      weightClassName: "-60kg",
      weightLimitText: null,
      skillLevel: null,
    },
  };
}

function main() {
  const before = buildFighterBracketSnapshot(sourceWithGym("팀라페짐"));
  assert.equal(before.gymName, "팀라페짐");
  assert.equal(before.name, "QA 선수A");
  assert.equal(before.fighterId, "f1");

  const after = buildFighterBracketSnapshot(sourceWithGym("팀라펠MMA짐"));
  assert.equal(after.gymName, "팀라펠MMA짐");
  assert.equal(after.fighterId, before.fighterId, "fighterId unchanged");
  assert.equal(after.name, before.name, "name unchanged when only gym edits");

  assert.notEqual(after.gymName, before.gymName, "gym display must update");

  console.log("verify:matched-athlete-gym-name-edit OK");
}

main();
