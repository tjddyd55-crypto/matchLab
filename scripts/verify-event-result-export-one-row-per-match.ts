/**
 * Archive 경기 결과 — BracketMatch 1경기 1행 projection 검증.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { MatchRecordOutcome, MatchRecordStatus } from "../src/generated/prisma";
import { projectArchiveMatchResults } from "../src/lib/event-archive/match-result-projection";
import type {
  EventArchiveBracketMatchSnapshot,
  EventArchiveBracketSnapshot,
  EventArchiveResultRowSnapshot,
  EventArchiveResultsSnapshot,
} from "../src/lib/event-archive/types";

const ROOT = path.resolve(__dirname, "..");

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

function resultRow(input: {
  matchId: string;
  matchNumber: number;
  fighterId: string;
  fighterName: string;
  gymName: string;
  opponentId: string;
  opponentName: string;
  opponentGym: string;
  result: MatchRecordOutcome;
  resultType?: string;
}): EventArchiveResultRowSnapshot {
  return {
    resultId: `${input.matchId}-${input.fighterId}`,
    matchId: input.matchId,
    matchNumber: input.matchNumber,
    bracketTitle: "단판",
    divisionLabel: "신청 division (무시)",
    fighterId: input.fighterId,
    fighterName: input.fighterName,
    fighterGymName: input.gymName,
    opponentId: input.opponentId,
    opponentName: input.opponentName,
    opponentGymName: input.opponentGym,
    result: input.result,
    resultLabel: input.result,
    resultType: input.resultType ?? "decision",
    resultTypeLabel: "판정",
    status: MatchRecordStatus.confirmed,
    statusLabel: "확정",
    matchDateLabel: "2026-09-01",
  };
}

function bracketMatch(input: {
  matchId: string;
  matchNumber: number;
  redId: string;
  redName: string;
  redGym: string;
  blueId: string;
  blueName: string;
  blueGym: string;
  winnerId: string;
  divisionLabel: string;
}): EventArchiveBracketMatchSnapshot {
  return {
    matchId: input.matchId,
    bracketId: "bracket-1",
    bracketTitle: "단판",
    matchNumber: input.matchNumber,
    globalMatchOrder: input.matchNumber,
    matchOrder: input.matchNumber,
    round: 1,
    roundName: null,
    divisionLabel: input.divisionLabel,
    courtName: "1코트",
    matNumber: 1,
    red: {
      fighterId: input.redId,
      name: input.redName,
      gymName: input.redGym,
      recordSummary: null,
    },
    blue: {
      fighterId: input.blueId,
      name: input.blueName,
      gymName: input.blueGym,
      recordSummary: null,
    },
    status: "finished",
    statusLabel: "종료",
    winnerId: input.winnerId,
    winnerName: input.winnerId === input.redId ? input.redName : input.blueName,
    loserId: null,
    loserName: null,
    resultType: "decision",
    resultTypeLabel: "판정",
    resultMemo: null,
    organizerMemo: null,
    matchWeightKg: null,
    nextMatchId: null,
    nextMatchSlot: null,
    hasOfficialResults: true,
  };
}

function assertRedWinOneRow() {
  const matchId = "match-4";
  const bracketSnapshot: EventArchiveBracketSnapshot = {
    matches: [
      bracketMatch({
        matchId,
        matchNumber: 4,
        redId: "f-red",
        redName: "하진성",
        redGym: "A체육관",
        blueId: "f-blue",
        blueName: "손태영",
        blueGym: "B체육관",
        winnerId: "f-red",
        divisionLabel: "일반부 · 남성 · 킥복싱",
      }),
    ],
    divisionCount: 1,
    totalMatchCount: 1,
  };
  const resultsSnapshot: EventArchiveResultsSnapshot = {
    totalCount: 2,
    rows: [
      resultRow({
        matchId,
        matchNumber: 4,
        fighterId: "f-red",
        fighterName: "하진성",
        gymName: "A체육관",
        opponentId: "f-blue",
        opponentName: "손태영",
        opponentGym: "B체육관",
        result: MatchRecordOutcome.win,
      }),
      resultRow({
        matchId,
        matchNumber: 4,
        fighterId: "f-blue",
        fighterName: "손태영",
        gymName: "B체육관",
        opponentId: "f-red",
        opponentName: "하진성",
        opponentGym: "A체육관",
        result: MatchRecordOutcome.loss,
      }),
    ],
  };

  const projected = projectArchiveMatchResults({
    bracketSnapshot,
    resultsSnapshot,
  });

  assert.equal(projected.length, 1);
  const row = projected[0]!;
  assert.equal(row.matchNumber, 4);
  assert.equal(row.redFighterName, "하진성");
  assert.equal(row.blueFighterName, "손태영");
  assert.equal(row.redGymName, "A체육관");
  assert.equal(row.blueGymName, "B체육관");
  assert.equal(row.outcomeLabel, "홍코너 승");
  assert.equal(row.winnerName, "하진성");
  assert.equal(row.divisionLabel, "일반부 · 남성 · 킥복싱");
  assert.equal(row.resultTypeLabel, "판정");
}

function assertDrawOneRow() {
  const matchId = "match-1";
  const bracketSnapshot: EventArchiveBracketSnapshot = {
    matches: [
      bracketMatch({
        matchId,
        matchNumber: 1,
        redId: "f-a",
        redName: "강호",
        redGym: "C체육관",
        blueId: "f-b",
        blueName: "박시환",
        blueGym: "D체육관",
        winnerId: "f-a",
        divisionLabel: "초등부 · 남성 · 킥복싱",
      }),
    ],
    divisionCount: 1,
    totalMatchCount: 1,
  };
  bracketSnapshot.matches[0]!.winnerId = null;
  bracketSnapshot.matches[0]!.winnerName = null;
  bracketSnapshot.matches[0]!.resultType = "draw";

  const resultsSnapshot: EventArchiveResultsSnapshot = {
    totalCount: 2,
    rows: [
      resultRow({
        matchId,
        matchNumber: 1,
        fighterId: "f-a",
        fighterName: "강호",
        gymName: "C체육관",
        opponentId: "f-b",
        opponentName: "박시환",
        opponentGym: "D체육관",
        result: MatchRecordOutcome.draw,
        resultType: "draw",
      }),
      resultRow({
        matchId,
        matchNumber: 1,
        fighterId: "f-b",
        fighterName: "박시환",
        gymName: "D체육관",
        opponentId: "f-a",
        opponentName: "강호",
        opponentGym: "C체육관",
        result: MatchRecordOutcome.draw,
        resultType: "draw",
      }),
    ],
  };

  const projected = projectArchiveMatchResults({
    bracketSnapshot,
    resultsSnapshot,
  });

  assert.equal(projected.length, 1);
  const row = projected[0]!;
  assert.equal(row.outcomeLabel, "무승부");
  assert.equal(row.winnerName, null);
  assert.equal(row.resultTypeLabel, "무승부");
}

function assertMatchOrdering() {
  const bracketSnapshot: EventArchiveBracketSnapshot = {
    matches: [
      bracketMatch({
        matchId: "m-2",
        matchNumber: 2,
        redId: "r2",
        redName: "R2",
        redGym: "G",
        blueId: "b2",
        blueName: "B2",
        blueGym: "G",
        winnerId: "r2",
        divisionLabel: "D",
      }),
      bracketMatch({
        matchId: "m-1",
        matchNumber: 1,
        redId: "r1",
        redName: "R1",
        redGym: "G",
        blueId: "b1",
        blueName: "B1",
        blueGym: "G",
        winnerId: "r1",
        divisionLabel: "D",
      }),
    ],
    divisionCount: 1,
    totalMatchCount: 2,
  };

  const rows: EventArchiveResultRowSnapshot[] = [];
  for (const m of bracketSnapshot.matches) {
    const redId = m.red!.fighterId!;
    const blueId = m.blue!.fighterId!;
    rows.push(
      resultRow({
        matchId: m.matchId,
        matchNumber: m.matchNumber!,
        fighterId: redId,
        fighterName: m.red!.name,
        gymName: "G",
        opponentId: blueId,
        opponentName: m.blue!.name,
        opponentGym: "G",
        result: MatchRecordOutcome.win,
      }),
      resultRow({
        matchId: m.matchId,
        matchNumber: m.matchNumber!,
        fighterId: blueId,
        fighterName: m.blue!.name,
        gymName: "G",
        opponentId: redId,
        opponentName: m.red!.name,
        opponentGym: "G",
        result: MatchRecordOutcome.loss,
      }),
    );
  }

  const projected = projectArchiveMatchResults({
    bracketSnapshot,
    resultsSnapshot: { rows, totalCount: rows.length },
  });

  assert.equal(projected.length, 2);
  assert.deepEqual(
    projected.map((r) => r.matchNumber),
    [1, 2],
  );
}

function assertStaticWiring() {
  const archiveView = read("src/components/domain/events/EventArchiveView.tsx");
  assert.match(archiveView, /projectArchiveMatchResults/);
  assert.match(archiveView, /홍코너/);
  assert.doesNotMatch(archiveView, /sortedResults/);

  const packageExport = read(
    "src/lib/services/event-archive-package-export.service.ts",
  );
  assert.match(packageExport, /projectArchiveMatchResults/);
  assert.match(packageExport, /redFighterName/);
  assert.doesNotMatch(packageExport, /resultsSnapshot\.rows/);
}

assertRedWinOneRow();
assertDrawOneRow();
assertMatchOrdering();
assertStaticWiring();

console.log("verify:event-result-export-one-row-per-match: OK");
