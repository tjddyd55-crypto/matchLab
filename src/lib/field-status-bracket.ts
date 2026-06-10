import { formatDivisionNameLabel } from "@/lib/bracket-snapshot";

export type FieldStatusBracketAssignmentVM = {
  matchId: string;
  matchLabel: string;
  opponentName: string;
  divisionLabel: string | null;
  hasOfficialResult: boolean;
};

function snapshotName(snapshot: unknown): string {
  if (
    snapshot &&
    typeof snapshot === "object" &&
    "name" in snapshot &&
    typeof (snapshot as { name: unknown }).name === "string"
  ) {
    return (snapshot as { name: string }).name;
  }
  return "미상";
}

export function buildFighterBracketAssignmentMap(
  matches: {
    id: string;
    matchNumber: number | null;
    globalMatchOrder: number | null;
    matchOrder: number;
    fighterRedId: string | null;
    fighterBlueId: string | null;
    fighterRedSnapshot: unknown;
    fighterBlueSnapshot: unknown;
    matchResults: { id: string }[];
    bracket: {
      division: {
        sportType: string;
        ruleType: string | null;
        gender: string | null;
        ageGroup: string | null;
        weightClass: string | null;
        skillLevel: string | null;
      } | null;
    };
  }[],
): Map<string, FieldStatusBracketAssignmentVM[]> {
  const map = new Map<string, FieldStatusBracketAssignmentVM[]>();

  function push(fighterId: string, row: FieldStatusBracketAssignmentVM) {
    const list = map.get(fighterId) ?? [];
    list.push(row);
    map.set(fighterId, list);
  }

  for (const m of matches) {
    const matchLabel =
      m.matchNumber != null
        ? `${m.matchNumber}경기`
        : `${(m.globalMatchOrder ?? m.matchOrder) + 1}번`;
    const divisionLabel = m.bracket.division
      ? formatDivisionNameLabel(m.bracket.division)
      : null;
    const hasOfficialResult = m.matchResults.length >= 2;

    if (m.fighterRedId) {
      push(m.fighterRedId, {
        matchId: m.id,
        matchLabel,
        opponentName: m.fighterBlueId
          ? snapshotName(m.fighterBlueSnapshot)
          : "미배정",
        divisionLabel,
        hasOfficialResult,
      });
    }
    if (m.fighterBlueId) {
      push(m.fighterBlueId, {
        matchId: m.id,
        matchLabel,
        opponentName: m.fighterRedId
          ? snapshotName(m.fighterRedSnapshot)
          : "미배정",
        divisionLabel,
        hasOfficialResult,
      });
    }
  }

  return map;
}
