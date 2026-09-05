/**
 * Result cancel → reconfirm public visibility
 *   npm run verify:result-cancel-reconfirm
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  MatchRecordOutcome,
  MatchRecordStatus,
} from "@/generated/prisma";
import {
  hasVoidedResultsForBothCorners,
  pickPublicMatchRepresentativeRow,
  selectOfficialRowsForPublicMatch,
} from "../src/lib/match-result-public-selection";
import { mapPublicResultCorners } from "../src/lib/public-result-corner-mapping";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function snap(id: string, name: string) {
  return {
    fighterId: id,
    fighterCode: id.toUpperCase(),
    name,
    gymName: "GYM",
    profileImageUrl: null,
  };
}

function assertVoidReactivateDetection() {
  const rows = [
    { fighterId: "red", status: MatchRecordStatus.voided },
    { fighterId: "blue", status: MatchRecordStatus.voided },
  ];
  assert.equal(
    hasVoidedResultsForBothCorners({
      rows,
      redFighterId: "red",
      blueFighterId: "blue",
    }),
    true,
  );
  assert.equal(
    hasVoidedResultsForBothCorners({
      rows: [{ fighterId: "red", status: MatchRecordStatus.voided }],
      redFighterId: "red",
      blueFighterId: "blue",
    }),
    false,
  );
}

function assertOfficialSelectionAfterReconfirm() {
  const t1 = new Date("2026-01-01T10:00:00Z");
  const t2 = new Date("2026-01-02T10:00:00Z");

  const mixed = [
    {
      fighterId: "red",
      status: MatchRecordStatus.voided,
      updatedAt: t1,
      result: MatchRecordOutcome.win,
      fighterSnapshot: snap("red", "old-red"),
      opponentSnapshot: snap("blue", "old-blue"),
    },
    {
      fighterId: "blue",
      status: MatchRecordStatus.voided,
      updatedAt: t1,
      result: MatchRecordOutcome.loss,
      fighterSnapshot: snap("blue", "old-blue"),
      opponentSnapshot: snap("red", "old-red"),
    },
    {
      fighterId: "red",
      status: MatchRecordStatus.confirmed,
      updatedAt: t2,
      result: MatchRecordOutcome.loss,
      fighterSnapshot: snap("red", "선수A"),
      opponentSnapshot: snap("blue", "하진성"),
    },
    {
      fighterId: "blue",
      status: MatchRecordStatus.confirmed,
      updatedAt: t2,
      result: MatchRecordOutcome.win,
      fighterSnapshot: snap("blue", "하진성"),
      opponentSnapshot: snap("red", "선수A"),
    },
  ];

  const official = selectOfficialRowsForPublicMatch(mixed);
  assert.equal(official.length, 2);
  assert.equal(official[0]?.fighterSnapshot.name, "선수A");

  const rep = pickPublicMatchRepresentativeRow(official);
  assert.equal(rep?.result, MatchRecordOutcome.win);

  const corners = mapPublicResultCorners({
    match: { fighterRedId: "red", fighterBlueId: "blue" },
    rows: official.map((row) => ({
      fighterId: row.fighterId,
      fighterSnapshot: row.fighterSnapshot,
      opponentSnapshot: row.opponentSnapshot,
      result: row.result,
    })),
  });

  assert.equal(corners.redFighter?.name, "선수A");
  assert.equal(corners.blueFighter?.name, "하진성");
  assert.equal(corners.winnerId, "blue");
}

function assertBlueWinnerCornerRegression() {
  const official = [
    {
      fighterId: "red",
      status: MatchRecordStatus.confirmed,
      updatedAt: new Date("2026-01-02T10:00:00Z"),
      result: MatchRecordOutcome.loss,
      fighterSnapshot: snap("red", "선수A"),
      opponentSnapshot: snap("blue", "하진성"),
    },
    {
      fighterId: "blue",
      status: MatchRecordStatus.confirmed,
      updatedAt: new Date("2026-01-02T10:00:00Z"),
      result: MatchRecordOutcome.win,
      fighterSnapshot: snap("blue", "하진성"),
      opponentSnapshot: snap("red", "선수A"),
    },
  ];

  const corners = mapPublicResultCorners({
    match: { fighterRedId: "red", fighterBlueId: "blue" },
    rows: official,
  });

  assert.notEqual(corners.redFighter?.fighterId, "blue");
  assert.equal(corners.winnerId, "blue");
}

function assertStaticWiring() {
  const service = read("src/lib/services/result.service.ts");
  assert.match(service, /hasVoidedResultsForBothCorners/);
  assert.match(service, /shouldReactivateVoided/);
  assert.match(service, /selectOfficialRowsForPublicMatch/);
  assert.match(service, /status: MatchRecordStatus\.confirmed/);

  const repo = read("src/lib/repositories/result.repository.ts");
  assert.match(repo, /updatedAt: true/);
}

function main() {
  assertVoidReactivateDetection();
  assertOfficialSelectionAfterReconfirm();
  assertBlueWinnerCornerRegression();
  assertStaticWiring();
  console.log("verify:result-cancel-reconfirm: OK");
}

main();
