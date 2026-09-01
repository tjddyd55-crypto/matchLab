/**
 * Fighter Career / Ranking Foundation SSOT
 *   npm run verify:fighter-career
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  BracketMatchOutcomeStyle,
  MatchRecordOutcome,
} from "../src/generated/prisma";
import { computeCareerStatsFromRecords } from "../src/lib/fighter-career/stats-calculator";

function read(rel: string) {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

const d = (iso: string) => new Date(iso);

function main() {
  const schema = read("prisma/schema.prisma");
  assert.match(schema, /model FighterCareerMatchRecord/);
  assert.match(schema, /model FighterCareerStats/);
  assert.match(schema, /@@unique\(\[fighterId, eventArchiveId, matchId\]\)/);
  assert.match(schema, /FighterCareerRecordStatus/);

  const careerService = read("src/lib/services/fighter-career.service.ts");
  assert.match(careerService, /syncFromArchiveInTransaction/);
  assert.match(careerService, /rebuildFighterCareerStats/);
  assert.match(careerService, /rebuildCareerForEventArchive/);

  const archiveService = read("src/lib/services/event-archive.service.ts");
  assert.match(archiveService, /fighterCareerService\.syncFromArchiveInTransaction/);

  const adminPage = read("src/app/(dashboard)/admin/fighters/[fighterId]/page.tsx");
  assert.match(adminPage, /FighterUnifiedCareerPanel/);

  // A vs B → A win, B loss
  const ab = computeCareerStatsFromRecords([
    {
      result: MatchRecordOutcome.win,
      resultType: BracketMatchOutcomeStyle.decision,
      eventDateSnapshot: d("2026-08-28T00:00:00.000Z"),
    },
  ]);
  assert.equal(ab.wins, 1);
  assert.equal(ab.losses, 0);
  assert.equal(ab.decisions, 1);

  const bLoss = computeCareerStatsFromRecords([
    {
      result: MatchRecordOutcome.loss,
      resultType: BracketMatchOutcomeStyle.decision,
      eventDateSnapshot: d("2026-08-28T00:00:00.000Z"),
    },
  ]);
  assert.equal(bLoss.losses, 1);

  // A: win then loss → 1승1패
  const aCareer = computeCareerStatsFromRecords([
    {
      result: MatchRecordOutcome.win,
      resultType: null,
      eventDateSnapshot: d("2026-08-01T00:00:00.000Z"),
    },
    {
      result: MatchRecordOutcome.loss,
      resultType: null,
      eventDateSnapshot: d("2026-08-28T00:00:00.000Z"),
    },
  ]);
  assert.equal(aCareer.wins, 1);
  assert.equal(aCareer.losses, 1);
  assert.equal(aCareer.totalMatches, 2);

  // C: 1 win from beating A
  const cCareer = computeCareerStatsFromRecords([
    {
      result: MatchRecordOutcome.win,
      resultType: null,
      eventDateSnapshot: d("2026-08-28T00:00:00.000Z"),
    },
  ]);
  assert.equal(cCareer.wins, 1);

  // B vs C draw
  const bWithDraw = computeCareerStatsFromRecords([
    {
      result: MatchRecordOutcome.loss,
      resultType: null,
      eventDateSnapshot: d("2026-08-28T00:00:00.000Z"),
    },
    {
      result: MatchRecordOutcome.draw,
      resultType: null,
      eventDateSnapshot: d("2026-08-29T00:00:00.000Z"),
    },
  ]);
  assert.equal(bWithDraw.losses, 1);
  assert.equal(bWithDraw.draws, 1);

  const cWithDraw = computeCareerStatsFromRecords([
    {
      result: MatchRecordOutcome.win,
      resultType: null,
      eventDateSnapshot: d("2026-08-28T00:00:00.000Z"),
    },
    {
      result: MatchRecordOutcome.draw,
      resultType: null,
      eventDateSnapshot: d("2026-08-29T00:00:00.000Z"),
    },
  ]);
  assert.equal(cWithDraw.wins, 1);
  assert.equal(cWithDraw.draws, 1);

  // 복수 경기: B in match1 + match2 → 2 records
  const bMulti = computeCareerStatsFromRecords([
    {
      result: MatchRecordOutcome.loss,
      resultType: null,
      eventDateSnapshot: d("2026-08-28T00:00:00.000Z"),
    },
    {
      result: MatchRecordOutcome.win,
      resultType: null,
      eventDateSnapshot: d("2026-08-28T00:00:00.000Z"),
    },
  ]);
  assert.equal(bMulti.totalMatches, 2);

  // no_contest not counted as win/loss/draw
  const nc = computeCareerStatsFromRecords([
    {
      result: MatchRecordOutcome.no_contest,
      resultType: null,
      eventDateSnapshot: d("2026-08-28T00:00:00.000Z"),
    },
  ]);
  assert.equal(nc.noContests, 1);
  assert.equal(nc.wins, 0);
  assert.equal(nc.losses, 0);

  // 결과 정정 시뮬: void old + new records
  const beforeCorrection = computeCareerStatsFromRecords([
    { result: MatchRecordOutcome.win, resultType: null, eventDateSnapshot: d("2026-08-28T00:00:00.000Z") },
    { result: MatchRecordOutcome.loss, resultType: null, eventDateSnapshot: d("2026-08-28T00:00:00.000Z") },
  ]);
  assert.equal(beforeCorrection.wins, 1);
  assert.equal(beforeCorrection.losses, 1);

  const aAfter = computeCareerStatsFromRecords([
    { result: MatchRecordOutcome.loss, resultType: null, eventDateSnapshot: d("2026-08-28T00:00:00.000Z") },
  ]);
  assert.equal(aAfter.wins, 0);
  assert.equal(aAfter.losses, 1);

  const bAfter = computeCareerStatsFromRecords([
    { result: MatchRecordOutcome.win, resultType: null, eventDateSnapshot: d("2026-08-28T00:00:00.000Z") },
  ]);
  assert.equal(bAfter.wins, 1);
  assert.equal(bAfter.losses, 0);

  // idempotency unique constraint
  assert.match(schema, /@@unique\(\[fighterId, eventArchiveId, matchId\]\)/);

  console.log("verify:fighter-career OK");
}

main();
