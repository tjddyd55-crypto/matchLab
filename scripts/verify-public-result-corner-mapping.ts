/**
 * Public result corner mapping — BracketMatch RED/BLUE SSOT
 *   npm run verify:public-result-corner-mapping
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MatchRecordOutcome } from "@/generated/prisma";
import {
  mapPublicResultCorners,
  parsePublicFighterSnapshot,
} from "../src/lib/public-result-corner-mapping";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function snap(id: string, name: string) {
  return {
    fighterId: id,
    fighterCode: id.toUpperCase(),
    name,
    gymName: "테스트체육관",
    profileImageUrl: null,
  };
}

function assertRedWinCase() {
  const fighterA = snap("fighter-a", "선수A");
  const fighterB = snap("fighter-b", "선수B");

  const mapped = mapPublicResultCorners({
    match: { fighterRedId: "fighter-a", fighterBlueId: "fighter-b" },
    rows: [
      {
        fighterId: "fighter-a",
        fighterSnapshot: fighterA,
        opponentSnapshot: fighterB,
        result: MatchRecordOutcome.win,
      },
      {
        fighterId: "fighter-b",
        fighterSnapshot: fighterB,
        opponentSnapshot: fighterA,
        result: MatchRecordOutcome.loss,
      },
    ],
  });

  assert.equal(mapped.redFighter?.fighterId, "fighter-a");
  assert.equal(mapped.blueFighter?.fighterId, "fighter-b");
  assert.equal(mapped.winnerId, "fighter-a");
  assert.equal(mapped.redFighter?.name, "선수A");
  assert.equal(mapped.blueFighter?.name, "선수B");
}

function assertBlueWinCase() {
  const fighterA = snap("fighter-a", "선수A");
  const fighterB = snap("fighter-b", "하진성");

  const mapped = mapPublicResultCorners({
    match: { fighterRedId: "fighter-a", fighterBlueId: "fighter-b" },
    rows: [
      {
        fighterId: "fighter-a",
        fighterSnapshot: fighterA,
        opponentSnapshot: fighterB,
        result: MatchRecordOutcome.loss,
      },
      {
        fighterId: "fighter-b",
        fighterSnapshot: fighterB,
        opponentSnapshot: fighterA,
        result: MatchRecordOutcome.win,
      },
    ],
  });

  assert.equal(mapped.redFighter?.fighterId, "fighter-a");
  assert.equal(mapped.blueFighter?.fighterId, "fighter-b");
  assert.equal(mapped.winnerId, "fighter-b");
  assert.equal(mapped.redFighter?.name, "선수A");
  assert.equal(mapped.blueFighter?.name, "하진성");
}

function assertWinnerRowNotRedCorner() {
  const fighterA = snap("fighter-a", "선수A");
  const fighterB = snap("fighter-b", "하진성");

  const mapped = mapPublicResultCorners({
    match: { fighterRedId: "fighter-a", fighterBlueId: "fighter-b" },
    rows: [
      {
        fighterId: "fighter-b",
        fighterSnapshot: fighterB,
        opponentSnapshot: fighterA,
        result: MatchRecordOutcome.win,
      },
    ],
  });

  assert.notEqual(mapped.redFighter?.fighterId, "fighter-b");
  assert.equal(mapped.redFighter?.fighterId, "fighter-a");
  assert.equal(mapped.blueFighter?.fighterId, "fighter-b");
}

function assertHistoricalSnapshotPerCornerRow() {
  const redHistorical = snap("fighter-a", "당시홍선수");
  const blueHistorical = snap("fighter-b", "당시청선수");

  const mapped = mapPublicResultCorners({
    match: { fighterRedId: "fighter-a", fighterBlueId: "fighter-b" },
    rows: [
      {
        fighterId: "fighter-a",
        fighterSnapshot: redHistorical,
        opponentSnapshot: blueHistorical,
        result: MatchRecordOutcome.loss,
      },
      {
        fighterId: "fighter-b",
        fighterSnapshot: blueHistorical,
        opponentSnapshot: redHistorical,
        result: MatchRecordOutcome.win,
      },
    ],
  });

  assert.equal(mapped.redFighter?.name, "당시홍선수");
  assert.equal(mapped.blueFighter?.name, "당시청선수");
}

function assertRepSnapshotFallback() {
  const fighterA = snap("fighter-a", "선수A");
  const fighterB = snap("fighter-b", "하진성");

  const mapped = mapPublicResultCorners({
    match: { fighterRedId: "fighter-a", fighterBlueId: "fighter-b" },
    rows: [
      {
        fighterId: "fighter-b",
        fighterSnapshot: fighterB,
        opponentSnapshot: fighterA,
        result: MatchRecordOutcome.win,
      },
    ],
  });

  assert.equal(mapped.redFighter?.name, "선수A");
  assert.equal(mapped.blueFighter?.name, "하진성");
}

function assertStaticWiring() {
  const service = read("src/lib/services/result.service.ts");
  assert.match(service, /mapPublicResultCorners/);
  assert.match(service, /fighterRedId/);
  assert.match(service, /redFighter: corners\.redFighter/);
  assert.match(service, /fighter: corners\.redFighter/);
  assert.match(service, /opponent: corners\.blueFighter/);

  const repo = read("src/lib/repositories/result.repository.ts");
  assert.match(repo, /listPublicResultsByEventSlug/);
  assert.match(repo, /fighterRedId: true/);
  assert.match(repo, /fighterBlueId: true/);

  const spectator = read(
    "src/components/domain/events/spectator/SpectatorResultCard.tsx",
  );
  assert.match(spectator, /result\.redFighter/);
  assert.match(spectator, /result\.winnerId/);
  assert.doesNotMatch(spectator, /result\.result === MatchRecordOutcome\.win/);

  const publicCard = read(
    "src/components/domain/events/public/PublicEventResultCard.tsx",
  );
  assert.match(publicCard, /result\.redFighter/);
  assert.match(publicCard, /result\.winnerId/);

  const opsSummary = read(
    "src/components/domain/operation/MatchFinalResultSummary.tsx",
  );
  assert.match(opsSummary, /fighterRedId/);
  assert.match(opsSummary, /fighterBlueId/);
}

function assertParseSnapshot() {
  const parsed = parsePublicFighterSnapshot({
    fighterId: "x",
    name: "테스트",
    fighterCode: "F001",
  });
  assert.equal(parsed?.fighterId, "x");
  assert.equal(parsed?.name, "테스트");
}

function main() {
  assertRedWinCase();
  assertBlueWinCase();
  assertWinnerRowNotRedCorner();
  assertHistoricalSnapshotPerCornerRow();
  assertRepSnapshotFallback();
  assertStaticWiring();
  assertParseSnapshot();
  console.log("verify:public-result-corner-mapping: OK");
}

main();
