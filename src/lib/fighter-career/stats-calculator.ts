import {
  BracketMatchOutcomeStyle,
  MatchRecordOutcome,
} from "@/generated/prisma";

export type CareerStatsInputRow = {
  result: MatchRecordOutcome;
  resultType: BracketMatchOutcomeStyle | null;
  eventDateSnapshot: Date;
};

export type CareerStatsComputed = {
  wins: number;
  losses: number;
  draws: number;
  noContests: number;
  totalMatches: number;
  knockouts: number;
  submissions: number;
  decisions: number;
  lastMatchAt: Date | null;
};

export function computeCareerStatsFromRecords(
  rows: CareerStatsInputRow[],
): CareerStatsComputed {
  let wins = 0;
  let losses = 0;
  let draws = 0;
  let noContests = 0;
  let knockouts = 0;
  let submissions = 0;
  let decisions = 0;
  let lastMatchAt: Date | null = null;

  for (const row of rows) {
    switch (row.result) {
      case MatchRecordOutcome.win:
        wins += 1;
        break;
      case MatchRecordOutcome.loss:
        losses += 1;
        break;
      case MatchRecordOutcome.draw:
        draws += 1;
        break;
      case MatchRecordOutcome.no_contest:
        noContests += 1;
        break;
      default:
        break;
    }

    switch (row.resultType) {
      case BracketMatchOutcomeStyle.ko:
      case BracketMatchOutcomeStyle.tko:
        knockouts += 1;
        break;
      case BracketMatchOutcomeStyle.submission:
        submissions += 1;
        break;
      case BracketMatchOutcomeStyle.decision:
        decisions += 1;
        break;
      default:
        break;
    }

    if (!lastMatchAt || row.eventDateSnapshot > lastMatchAt) {
      lastMatchAt = row.eventDateSnapshot;
    }
  }

  return {
    wins,
    losses,
    draws,
    noContests,
    totalMatches: rows.length,
    knockouts,
    submissions,
    decisions,
    lastMatchAt,
  };
}
