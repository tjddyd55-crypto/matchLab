import type { MatchRecordOutcome } from "@/generated/prisma";

export type FighterCareerStatsSnapshot = {
  wins: number;
  losses: number;
  draws: number;
  noContests: number;
  totalMatches: number;
  knockouts: number;
  submissions: number;
  decisions: number;
  lastMatchAt: string | null;
};

export type FighterCareerMatchRecordView = {
  id: string;
  eventId: string;
  matchId: string;
  eventArchiveId: string;
  archiveVersion: number;
  opponentFighterId: string | null;
  result: MatchRecordOutcome;
  resultLabel: string;
  resultType: string | null;
  resultTypeLabel: string | null;
  sportType: string | null;
  divisionLabel: string | null;
  fighterNameSnapshot: string;
  opponentNameSnapshot: string | null;
  gymNameSnapshot: string | null;
  opponentGymNameSnapshot: string | null;
  eventNameSnapshot: string;
  eventDateSnapshot: string;
  matchNumber: number | null;
};

export type FighterCareerProfileView = {
  fighterId: string;
  name: string;
  gender: string;
  birthYear: number | null;
  currentGymName: string | null;
  stats: FighterCareerStatsSnapshot;
  records: FighterCareerMatchRecordView[];
};

export function formatFighterCareerSummary(stats: FighterCareerStatsSnapshot): string {
  const parts = [`${stats.wins}승`, `${stats.losses}패`];
  if (stats.draws > 0) parts.push(`${stats.draws}무`);
  if (stats.noContests > 0) parts.push(`${stats.noContests}노콘`);
  return `${parts.join(" ")} · 총 ${stats.totalMatches}경기`;
}

export function outcomeLabel(result: MatchRecordOutcome): string {
  switch (result) {
    case "win":
      return "승";
    case "loss":
      return "패";
    case "draw":
      return "무";
    case "no_contest":
      return "노콘";
    default:
      return String(result);
  }
}
