import { MatchRecordOutcome, MatchRecordStatus } from "@/lib/enums";
import { PUBLIC_OFFICIAL_MATCH_RESULT_STATUSES } from "@/lib/public-official-result";

export type OfficialMatchResultRowLike = {
  fighterId: string;
  status: MatchRecordStatus;
  updatedAt: Date;
  result: MatchRecordOutcome;
};

export function selectOfficialRowsForPublicMatch<
  T extends OfficialMatchResultRowLike,
>(rows: T[]): T[] {
  const official = rows.filter((row) =>
    PUBLIC_OFFICIAL_MATCH_RESULT_STATUSES.includes(row.status),
  );
  const byFighter = new Map<string, T>();
  for (const row of official) {
    const prev = byFighter.get(row.fighterId);
    if (!prev || row.updatedAt.getTime() > prev.updatedAt.getTime()) {
      byFighter.set(row.fighterId, row);
    }
  }
  return [...byFighter.values()];
}

export function pickPublicMatchRepresentativeRow<
  T extends { result: MatchRecordOutcome },
>(rows: T[]): T | null {
  if (rows.length === 0) return null;
  return rows.find((row) => row.result === MatchRecordOutcome.win) ?? rows[0]!;
}

export function hasVoidedResultsForBothCorners(input: {
  rows: { fighterId: string; status: MatchRecordStatus }[];
  redFighterId: string;
  blueFighterId: string;
}): boolean {
  const voidedIds = new Set(
    input.rows
      .filter((row) => row.status === MatchRecordStatus.voided)
      .map((row) => row.fighterId),
  );
  return voidedIds.has(input.redFighterId) && voidedIds.has(input.blueFighterId);
}
