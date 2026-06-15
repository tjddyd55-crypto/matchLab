import { formatDivisionNameLabel } from "@/lib/bracket-snapshot";
import type { matchRepository } from "@/lib/repositories/match.repository";

export type ScheduleMatchVM = {
  matchId: string;
  bracketTitle: string;
  divisionLabel: string | null;
  fighterRedName: string | null;
  fighterBlueName: string | null;
  courtId: string | null;
  courtOrder: number | null;
  status: string;
  hasOfficialResults: boolean;
};

export function mapScheduleMatches(
  rows: Awaited<
    ReturnType<typeof matchRepository.listMatchesByEvent>
  >,
): ScheduleMatchVM[] {
  return rows.map((m) => ({
    matchId: m.id,
    bracketTitle: m.bracket?.title ?? "—",
    divisionLabel: m.bracket?.division
      ? formatDivisionNameLabel(m.bracket.division)
      : null,
    fighterRedName: m.fighterRed?.name ?? null,
    fighterBlueName: m.fighterBlue?.name ?? null,
    courtId: m.courtId ?? null,
    courtOrder: m.courtOrder ?? null,
    status: m.status,
    hasOfficialResults: (m.matchResults?.length ?? 0) >= 2,
  }));
}
