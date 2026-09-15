import type { BracketMatchOutcomeStyle } from "@/lib/enums";
import {
  MatchRecordOutcome,
  MatchRecordStatus,
} from "@/lib/enums";
import type {
  EventArchiveBracketMatchSnapshot,
  EventArchiveBracketSnapshot,
  EventArchiveResultRowSnapshot,
  EventArchiveResultsSnapshot,
} from "@/lib/event-archive/types";
import { mapPublicResultCorners } from "@/lib/public-result-corner-mapping";
import { buildPublicResultTypeLabel } from "@/lib/public-official-result";
import { PUBLIC_OFFICIAL_MATCH_RESULT_STATUSES } from "@/lib/public-official-result";

/** 대회 기록 UI·Excel용 — BracketMatch 1경기 1행 */
export type EventArchiveMatchResultProjectionRow = {
  matchId: string;
  matchNumber: number | null;
  bracketTitle: string;
  divisionLabel: string | null;
  redFighterName: string;
  redGymName: string | null;
  blueFighterName: string;
  blueGymName: string | null;
  outcomeLabel: string;
  winnerName: string | null;
  resultTypeLabel: string | null;
  statusLabel: string;
  matchDateLabel: string | null;
};

function selectOfficialRowsFromArchiveSnapshot(
  rows: EventArchiveResultRowSnapshot[],
): EventArchiveResultRowSnapshot[] {
  const official = rows.filter((row) =>
    PUBLIC_OFFICIAL_MATCH_RESULT_STATUSES.includes(
      row.status as MatchRecordStatus,
    ),
  );
  const byFighter = new Map<string, EventArchiveResultRowSnapshot>();
  for (const row of official) {
    byFighter.set(row.fighterId, row);
  }
  return [...byFighter.values()];
}

function sortBracketMatches(
  matches: EventArchiveBracketMatchSnapshot[],
): EventArchiveBracketMatchSnapshot[] {
  return [...matches].sort((a, b) => {
    const an = a.matchNumber ?? a.globalMatchOrder ?? a.matchOrder;
    const bn = b.matchNumber ?? b.globalMatchOrder ?? b.matchOrder;
    return an - bn;
  });
}

function isDrawMatch(
  winnerId: string | null,
  officialRows: EventArchiveResultRowSnapshot[],
): boolean {
  if (officialRows.some((row) => row.result === MatchRecordOutcome.draw)) {
    return true;
  }
  if (winnerId != null) return false;
  if (officialRows.length < 2) return false;
  return !officialRows.some((row) => row.result === MatchRecordOutcome.win);
}

function resolveOutcomeLabel(
  winnerId: string | null,
  redFighterId: string | null,
  blueFighterId: string | null,
  isDraw: boolean,
): string {
  if (isDraw) return "무승부";
  if (winnerId && winnerId === redFighterId) return "홍코너 승";
  if (winnerId && winnerId === blueFighterId) return "청코너 승";
  return "—";
}

function resolveWinnerName(
  winnerId: string | null,
  match: EventArchiveBracketMatchSnapshot,
  isDraw: boolean,
): string | null {
  if (isDraw || !winnerId) return null;
  if (match.winnerName) return match.winnerName;
  if (winnerId === match.red?.fighterId) return match.red?.name ?? null;
  if (winnerId === match.blue?.fighterId) return match.blue?.name ?? null;
  return null;
}

function resolveResultTypeLabel(
  isDraw: boolean,
  match: EventArchiveBracketMatchSnapshot,
  officialRows: EventArchiveResultRowSnapshot[],
): string | null {
  if (isDraw) return "무승부";
  return (
    buildPublicResultTypeLabel(
      officialRows.map((row) => ({
        status: row.status as MatchRecordStatus,
        result: row.result as MatchRecordOutcome,
        resultType: row.resultType as BracketMatchOutcomeStyle | null,
      })),
      match.resultType as BracketMatchOutcomeStyle | null,
    ) ?? match.resultTypeLabel
  );
}

function toPublicResultRows(
  officialRows: EventArchiveResultRowSnapshot[],
): {
  fighterId: string;
  fighterSnapshot: unknown;
  opponentSnapshot: unknown;
  result: MatchRecordOutcome;
}[] {
  return officialRows.map((row) => ({
    fighterId: row.fighterId,
    fighterSnapshot: {
      fighterId: row.fighterId,
      fighterCode: row.fighterId,
      name: row.fighterName,
      gymName: row.fighterGymName,
      profileImageUrl: null,
    },
    opponentSnapshot: row.opponentId
      ? {
          fighterId: row.opponentId,
          fighterCode: row.opponentId,
          name: row.opponentName ?? "",
          gymName: row.opponentGymName,
          profileImageUrl: null,
        }
      : null,
    result: row.result as MatchRecordOutcome,
  }));
}

export function projectArchiveMatchResults(input: {
  bracketSnapshot: EventArchiveBracketSnapshot;
  resultsSnapshot: EventArchiveResultsSnapshot;
}): EventArchiveMatchResultProjectionRow[] {
  const resultsByMatch = new Map<string, EventArchiveResultRowSnapshot[]>();
  for (const row of input.resultsSnapshot.rows) {
    const list = resultsByMatch.get(row.matchId) ?? [];
    list.push(row);
    resultsByMatch.set(row.matchId, list);
  }

  const projected: EventArchiveMatchResultProjectionRow[] = [];

  for (const match of sortBracketMatches(input.bracketSnapshot.matches)) {
    const rawRows = resultsByMatch.get(match.matchId) ?? [];
    const officialRows = selectOfficialRowsFromArchiveSnapshot(rawRows);
    if (officialRows.length < 2) continue;

    const redFighterId = match.red?.fighterId ?? null;
    const blueFighterId = match.blue?.fighterId ?? null;

    const cornerMapped = mapPublicResultCorners({
      match: { fighterRedId: redFighterId, fighterBlueId: blueFighterId },
      rows: toPublicResultRows(officialRows),
    });

    const winnerId = match.winnerId ?? cornerMapped.winnerId;
    const isDraw = isDrawMatch(winnerId, officialRows);
    const repRow = officialRows[0]!;

    projected.push({
      matchId: match.matchId,
      matchNumber: match.matchNumber,
      bracketTitle: match.bracketTitle,
      divisionLabel: match.divisionLabel,
      redFighterName: match.red?.name ?? cornerMapped.redFighter?.name ?? "—",
      redGymName: match.red?.gymName ?? cornerMapped.redFighter?.gymName ?? null,
      blueFighterName:
        match.blue?.name ?? cornerMapped.blueFighter?.name ?? "—",
      blueGymName:
        match.blue?.gymName ?? cornerMapped.blueFighter?.gymName ?? null,
      outcomeLabel: resolveOutcomeLabel(
        winnerId,
        redFighterId,
        blueFighterId,
        isDraw,
      ),
      winnerName: resolveWinnerName(winnerId, match, isDraw),
      resultTypeLabel: resolveResultTypeLabel(isDraw, match, officialRows),
      statusLabel: repRow.statusLabel,
      matchDateLabel: repRow.matchDateLabel,
    });
  }

  return projected;
}
