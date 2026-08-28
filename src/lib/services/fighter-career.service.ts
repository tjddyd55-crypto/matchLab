import "server-only";

import type { Prisma } from "@/generated/prisma";
import {
  BracketMatchOutcomeStyle,
  MatchRecordOutcome,
} from "@/generated/prisma";
import type {
  EventArchiveEventSnapshot,
  EventArchiveResultRowSnapshot,
  EventArchiveResultsSnapshot,
} from "@/lib/event-archive/types";
import { computeCareerStatsFromRecords } from "@/lib/fighter-career/stats-calculator";
import {
  formatFighterCareerSummary,
  outcomeLabel,
  type FighterCareerMatchRecordView,
  type FighterCareerProfileView,
  type FighterCareerStatsSnapshot,
} from "@/lib/fighter-career/types";
import { outcomeStylePublicLabel } from "@/lib/match-result-snapshot";
import { fighterCareerRepository } from "@/lib/repositories/fighter-career.repository";
import { fighterRepository } from "@/lib/repositories/fighter.repository";

function parseOutcome(raw: string): MatchRecordOutcome {
  if (
    raw === MatchRecordOutcome.win ||
    raw === MatchRecordOutcome.loss ||
    raw === MatchRecordOutcome.draw ||
    raw === MatchRecordOutcome.no_contest
  ) {
    return raw;
  }
  throw new Error(`INVALID_CAREER_OUTCOME:${raw}`);
}

function parseResultType(
  raw: string | null,
): BracketMatchOutcomeStyle | null {
  if (!raw) return null;
  const values = Object.values(BracketMatchOutcomeStyle) as string[];
  return values.includes(raw) ? (raw as BracketMatchOutcomeStyle) : null;
}

function parseEventDate(label: string | null): Date {
  if (!label?.trim()) return new Date(0);
  const d = new Date(`${label.trim()}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return new Date(0);
  return d;
}

function extractSportType(divisionLabel: string | null): string | null {
  if (!divisionLabel?.trim()) return null;
  const first = divisionLabel.trim().split(/\s+/)[0];
  return first || null;
}

function computeStatsFromRecords(
  rows: Array<{
    result: MatchRecordOutcome;
    resultType: BracketMatchOutcomeStyle | null;
    eventDateSnapshot: Date;
  }>,
) {
  return computeCareerStatsFromRecords(rows);
}

function buildCareerRecordsFromArchive(input: {
  eventId: string;
  eventArchiveId: string;
  archiveVersion: number;
  eventSnapshot: EventArchiveEventSnapshot;
  resultsSnapshot: EventArchiveResultsSnapshot;
}) {
  const eventName = input.eventSnapshot.title;
  const eventDate = parseEventDate(input.eventSnapshot.eventDateLabel);

  return input.resultsSnapshot.rows
    .filter((row) => row.fighterId?.trim())
    .map((row: EventArchiveResultRowSnapshot) => ({
      fighterId: row.fighterId,
      eventId: input.eventId,
      matchId: row.matchId,
      eventArchiveId: input.eventArchiveId,
      archiveVersion: input.archiveVersion,
      matchResultId: row.resultId,
      opponentFighterId: row.opponentId,
      result: parseOutcome(row.result),
      resultType: parseResultType(row.resultType),
      sportType: extractSportType(row.divisionLabel),
      divisionLabel: row.divisionLabel,
      divisionSnapshot: row.divisionLabel
        ? ({ label: row.divisionLabel } as Prisma.InputJsonValue)
        : null,
      fighterNameSnapshot: row.fighterName,
      opponentNameSnapshot: row.opponentName,
      gymNameSnapshot: row.fighterGymName,
      opponentGymNameSnapshot: row.opponentGymName,
      eventNameSnapshot: eventName,
      eventDateSnapshot: row.matchDateLabel
        ? parseEventDate(row.matchDateLabel)
        : eventDate,
      matchNumber: row.matchNumber,
    }));
}

function toStatsSnapshot(row: {
  wins: number;
  losses: number;
  draws: number;
  noContests: number;
  totalMatches: number;
  knockouts: number;
  submissions: number;
  decisions: number;
  lastMatchAt: Date | null;
}): FighterCareerStatsSnapshot {
  return {
    wins: row.wins,
    losses: row.losses,
    draws: row.draws,
    noContests: row.noContests,
    totalMatches: row.totalMatches,
    knockouts: row.knockouts,
    submissions: row.submissions,
    decisions: row.decisions,
    lastMatchAt: row.lastMatchAt?.toISOString() ?? null,
  };
}

function emptyStats(): FighterCareerStatsSnapshot {
  return {
    wins: 0,
    losses: 0,
    draws: 0,
    noContests: 0,
    totalMatches: 0,
    knockouts: 0,
    submissions: 0,
    decisions: 0,
    lastMatchAt: null,
  };
}

export const fighterCareerService = {
  /** Archive 생성 트랜잭션 내 career sync — idempotent */
  async syncFromArchiveInTransaction(
    tx: Prisma.TransactionClient,
    input: {
      eventId: string;
      eventArchiveId: string;
      archiveVersion: number;
      eventSnapshot: EventArchiveEventSnapshot;
      resultsSnapshot: EventArchiveResultsSnapshot;
    },
  ): Promise<{ created: number; fighterIds: string[] }> {
    const existing = await fighterCareerRepository.countByEventArchiveId(
      input.eventArchiveId,
      tx,
    );
    if (existing > 0) {
      const fighterIds =
        await fighterCareerRepository.findDistinctFighterIdsByEventArchiveId(
          input.eventArchiveId,
          tx,
        );
      return { created: 0, fighterIds };
    }

    const rows = buildCareerRecordsFromArchive(input);
    const created = await fighterCareerRepository.createMany(rows, tx);
    const fighterIds = [...new Set(rows.map((r) => r.fighterId))];
    for (const fighterId of fighterIds) {
      await this.rebuildFighterCareerStats(fighterId, tx);
    }
    return { created, fighterIds };
  },

  async rebuildFighterCareerStats(
    fighterId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<FighterCareerStatsSnapshot> {
    const rows = await fighterCareerRepository.listActiveForStatsByFighterId(
      fighterId,
      tx,
    );
    const stats = computeStatsFromRecords(rows);
    await fighterCareerRepository.upsertStats(fighterId, stats, tx);
    return toStatsSnapshot(stats);
  },

  /** Archive revision/정정 — void 후 재생성 */
  async rebuildCareerForEventArchive(
    input: {
      eventId: string;
      eventArchiveId: string;
      archiveVersion: number;
      eventSnapshot: EventArchiveEventSnapshot;
      resultsSnapshot: EventArchiveResultsSnapshot;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<{ voided: number; created: number }> {
    const run = async (client: Prisma.TransactionClient) => {
      const voided = await fighterCareerRepository.voidByEventArchiveId(
        input.eventArchiveId,
        client,
      );
      await fighterCareerRepository.deleteVoidedByEventArchiveId(
        input.eventArchiveId,
        client,
      );
      const rows = buildCareerRecordsFromArchive(input);
      const created = await fighterCareerRepository.createMany(rows, client);
      const fighterIds = [...new Set(rows.map((r) => r.fighterId))];
      for (const fighterId of fighterIds) {
        await this.rebuildFighterCareerStats(fighterId, client);
      }
      return { voided, created };
    };

    if (tx) return run(tx);
    const { prisma } = await import("@/lib/prisma");
    return prisma.$transaction(run, { maxWait: 15_000, timeout: 60_000 });
  },

  async getFighterCareerProfile(
    fighterId: string,
  ): Promise<FighterCareerProfileView | null> {
    const fighter = await fighterRepository.findFighterCareerHeader(fighterId);
    if (!fighter) return null;

    const [statsRow, records] = await Promise.all([
      fighterCareerRepository.findStatsByFighterId(fighterId),
      fighterCareerRepository.listActiveByFighterId(fighterId),
    ]);

    const stats = statsRow
      ? toStatsSnapshot(statsRow)
      : emptyStats();

    const recordViews: FighterCareerMatchRecordView[] = records.map((r) => ({
      id: r.id,
      eventId: r.eventId,
      matchId: r.matchId,
      eventArchiveId: r.eventArchiveId,
      archiveVersion: r.archiveVersion,
      opponentFighterId: r.opponentFighterId,
      result: r.result,
      resultLabel: outcomeLabel(r.result),
      resultType: r.resultType,
      resultTypeLabel: r.resultType
        ? outcomeStylePublicLabel(r.resultType)
        : null,
      sportType: r.sportType,
      divisionLabel: r.divisionLabel,
      fighterNameSnapshot: r.fighterNameSnapshot,
      opponentNameSnapshot: r.opponentNameSnapshot,
      gymNameSnapshot: r.gymNameSnapshot,
      opponentGymNameSnapshot: r.opponentGymNameSnapshot,
      eventNameSnapshot: r.eventNameSnapshot,
      eventDateSnapshot: r.eventDateSnapshot.toISOString(),
      matchNumber: r.matchNumber,
    }));

    const birthYear = fighter.birthDate
      ? fighter.birthDate.getUTCFullYear()
      : null;

    return {
      fighterId: fighter.id,
      name: fighter.name,
      gender: fighter.gender,
      birthYear,
      currentGymName: fighter.currentGym?.name ?? null,
      stats,
      records: recordViews,
    };
  },

  formatSummary(stats: FighterCareerStatsSnapshot): string {
    return formatFighterCareerSummary(stats);
  },
};
