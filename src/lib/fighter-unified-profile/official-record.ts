import type { MatchRecordOutcome } from "@/lib/enums";
import type { FighterOfficialRecord } from "@/lib/fighter-unified-profile/types";

/** MatchResult(confirmed/corrected) rows — fighter perspective, one row per bout. */
export function computeOfficialRecordFromResults(
  rows: { result: MatchRecordOutcome }[],
): FighterOfficialRecord {
  let wins = 0;
  let losses = 0;
  let draws = 0;
  let noContests = 0;

  for (const row of rows) {
    switch (row.result) {
      case "win":
        wins += 1;
        break;
      case "loss":
        losses += 1;
        break;
      case "draw":
        draws += 1;
        break;
      case "no_contest":
        noContests += 1;
        break;
      default:
        break;
    }
  }

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

export function formatOfficialRecordSummary(record: FighterOfficialRecord): string {
  const parts = [`${record.wins}승`, `${record.losses}패`];
  if (record.draws > 0) parts.push(`${record.draws}무`);
  if (record.noContests > 0) parts.push(`${record.noContests}NC`);
  return parts.join(" ");
}
