import {
  formatDivisionNameLabel,
  parseBracketFighterSnapshot,
} from "@/lib/bracket-snapshot";
import type { FighterHandicapDisplay } from "@/lib/fighter-handicap-display";
import type { BracketMatchStatus } from "@/lib/enums";

export type FieldStatusBracketAssignmentVM = {
  matchId: string;
  matchLabel: string;
  opponentName: string;
  divisionLabel: string | null;
  hasOfficialResult: boolean;
  status: BracketMatchStatus;
  winnerId: string | null;
  fighterCorner: "red" | "blue";
  fighterRedId: string | null;
  fighterRedName: string;
  fighterRedGym: string | null;
  fighterRedHandicap: FighterHandicapDisplay | null;
  fighterBlueId: string | null;
  fighterBlueName: string;
  fighterBlueGym: string | null;
  fighterBlueHandicap: FighterHandicapDisplay | null;
};

function snapshotFighter(snapshot: unknown): {
  id: string;
  name: string;
  gymName: string | null;
} {
  const parsed = parseBracketFighterSnapshot(snapshot);
  if (parsed) {
    return {
      id: parsed.fighterId,
      name: parsed.name,
      gymName: parsed.gymName,
    };
  }
  return { id: "", name: "미상", gymName: null };
}

function handicapFor(
  handicapMap: Map<string, FighterHandicapDisplay> | undefined,
  fighterId: string | null,
): FighterHandicapDisplay | null {
  if (!fighterId || !handicapMap) return null;
  return handicapMap.get(fighterId) ?? null;
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
    status: BracketMatchStatus;
    winnerId: string | null;
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
  handicapMap?: Map<string, FighterHandicapDisplay>,
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

    const red = snapshotFighter(m.fighterRedSnapshot);
    const blue = snapshotFighter(m.fighterBlueSnapshot);
    const redHandicap = handicapFor(handicapMap, m.fighterRedId);
    const blueHandicap = handicapFor(handicapMap, m.fighterBlueId);

    if (m.fighterRedId) {
      push(m.fighterRedId, {
        matchId: m.id,
        matchLabel,
        opponentName: m.fighterBlueId ? blue.name : "미배정",
        divisionLabel,
        hasOfficialResult,
        status: m.status,
        winnerId: m.winnerId,
        fighterCorner: "red",
        fighterRedId: m.fighterRedId,
        fighterRedName: red.name,
        fighterRedGym: red.gymName,
        fighterRedHandicap: redHandicap,
        fighterBlueId: m.fighterBlueId,
        fighterBlueName: blue.name,
        fighterBlueGym: blue.gymName,
        fighterBlueHandicap: blueHandicap,
      });
    }
    if (m.fighterBlueId) {
      push(m.fighterBlueId, {
        matchId: m.id,
        matchLabel,
        opponentName: m.fighterRedId ? red.name : "미배정",
        divisionLabel,
        hasOfficialResult,
        status: m.status,
        winnerId: m.winnerId,
        fighterCorner: "blue",
        fighterRedId: m.fighterRedId,
        fighterRedName: red.name,
        fighterRedGym: red.gymName,
        fighterRedHandicap: redHandicap,
        fighterBlueId: m.fighterBlueId,
        fighterBlueName: blue.name,
        fighterBlueGym: blue.gymName,
        fighterBlueHandicap: blueHandicap,
      });
    }
  }

  return map;
}
