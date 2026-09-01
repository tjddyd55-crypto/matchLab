import type {
  FighterCombinedRecord,
  FighterExternalRecord,
  FighterOfficialRecord,
} from "@/lib/fighter-unified-profile/types";
import {
  buildRecordText,
  hasCompleteRecordDetails,
  type StructuredRecord,
} from "@/lib/fighter/record";

export type FighterRecordCountsInput = {
  wins: number;
  losses: number;
  draws: number;
  noContests: number;
};

export function buildRecordCounts(input: FighterRecordCountsInput): FighterOfficialRecord {
  const wins = Math.max(0, Math.floor(input.wins));
  const losses = Math.max(0, Math.floor(input.losses));
  const draws = Math.max(0, Math.floor(input.draws));
  const noContests = Math.max(0, Math.floor(input.noContests));
  const bouts = wins + losses + draws;
  return {
    wins,
    losses,
    draws,
    noContests,
    bouts,
    totalMatches: bouts + noContests,
  };
}

export function buildExternalRecordFromFighter(f: {
  externalRecordWin: number;
  externalRecordLoss: number;
  externalRecordDraw: number;
  externalRecordNoContest: number;
}): FighterExternalRecord {
  return buildRecordCounts({
    wins: f.externalRecordWin,
    losses: f.externalRecordLoss,
    draws: f.externalRecordDraw,
    noContests: f.externalRecordNoContest,
  });
}

export function computeCombinedRecord(
  official: FighterOfficialRecord,
  external: FighterExternalRecord,
): FighterCombinedRecord {
  return buildRecordCounts({
    wins: official.wins + external.wins,
    losses: official.losses + external.losses,
    draws: official.draws + external.draws,
    noContests: official.noContests + external.noContests,
  });
}

export function formatRecordBoutsSummary(record: FighterOfficialRecord): string {
  if (record.totalMatches === 0) return "무전";
  const parts = [`${record.totalMatches}전`, `${record.wins}승`, `${record.losses}패`];
  if (record.draws > 0) parts.push(`${record.draws}무`);
  if (record.noContests > 0) parts.push(`${record.noContests}NC`);
  return parts.join(" ");
}

/** Gym 신규 선수 등록 structuredRecord → externalRecord* (record* 캐시에는 쓰지 않음) */
export function structuredRecordToExternalFields(rec: StructuredRecord): {
  externalRecordWin: number;
  externalRecordLoss: number;
  externalRecordDraw: number;
  externalRecordNoContest: number;
  recordText?: string;
} {
  if (hasCompleteRecordDetails(rec)) {
    return {
      externalRecordWin: rec.wins ?? 0,
      externalRecordLoss: rec.losses ?? 0,
      externalRecordDraw: rec.draws ?? 0,
      externalRecordNoContest: 0,
      recordText: buildRecordText(rec),
    };
  }
  return {
    externalRecordWin: 0,
    externalRecordLoss: 0,
    externalRecordDraw: 0,
    externalRecordNoContest: 0,
    ...(rec.totalBouts > 0 ? { recordText: buildRecordText(rec) } : {}),
  };
}
