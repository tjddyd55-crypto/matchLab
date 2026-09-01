/**
 * Fighter external record — combined calculation & isolation (static)
 *   npx tsx scripts/verify-fighter-external-record.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildExternalRecordFromFighter,
  computeCombinedRecord,
} from "../src/lib/fighter-unified-profile/record-utils";

function read(rel: string) {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

function main() {
  const external = buildExternalRecordFromFighter({
    externalRecordWin: 4,
    externalRecordLoss: 3,
    externalRecordDraw: 0,
    externalRecordNoContest: 1,
  });
  assert.equal(external.wins, 4);
  assert.equal(external.losses, 3);
  assert.equal(external.bouts, 7);
  assert.equal(external.totalMatches, 8);

  const official = {
    wins: 4,
    losses: 1,
    draws: 0,
    noContests: 0,
    bouts: 5,
    totalMatches: 5,
  };

  const combined = computeCombinedRecord(official, external);
  assert.equal(combined.wins, 8);
  assert.equal(combined.losses, 4);
  assert.equal(combined.draws, 0);
  assert.equal(combined.noContests, 1);
  assert.equal(combined.bouts, 12);
  assert.equal(combined.totalMatches, 13);

  const officialChanged = computeCombinedRecord(
    { ...official, wins: 5, bouts: 6, totalMatches: 6 },
    external,
  );
  assert.equal(officialChanged.wins, 9);
  assert.equal(officialChanged.losses, 4);

  const externalChanged = computeCombinedRecord(official, {
    ...external,
    wins: 6,
    bouts: 9,
    totalMatches: 10,
  });
  assert.equal(externalChanged.wins, 10);
  assert.equal(externalChanged.losses, 4);
  assert.equal(official.wins, 4);

  const svc = read("src/lib/services/fighter-external-record.service.ts");
  assert.match(svc, /updateExternalRecord/);
  assert.doesNotMatch(svc, /eventApplication/);
  assert.doesNotMatch(svc, /bracketMatch/);
  assert.doesNotMatch(svc, /matchResult/);

  const schema = read("prisma/schema.prisma");
  for (const field of [
    "externalRecordWin",
    "externalRecordLoss",
    "externalRecordDraw",
    "externalRecordNoContest",
  ]) {
    assert.match(schema, new RegExp(field));
  }

  const migration = read(
    "prisma/migrations/20260901170000_fighter_external_record/migration.sql",
  );
  assert.match(migration, /ADD COLUMN.*externalRecordWin/);
  assert.doesNotMatch(migration, /UPDATE\s+"Fighter"/i);
  assert.doesNotMatch(migration, /UPDATE\s+"EventApplication"/i);
  assert.doesNotMatch(migration, /UPDATE\s+"BracketMatch"/i);

  console.log("verify-fighter-external-record: PASS");
}

main();
