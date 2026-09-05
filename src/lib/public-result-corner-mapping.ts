import type { PublicRecordFighterDTO } from "@/lib/dto/public";
import { MatchRecordOutcome } from "@/lib/enums";

export function parsePublicFighterSnapshot(
  raw: unknown,
): PublicRecordFighterDTO | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.fighterId !== "string" || typeof o.name !== "string") return null;
  return {
    fighterId: o.fighterId,
    fighterCode: typeof o.fighterCode === "string" ? o.fighterCode : "",
    name: o.name,
    gymName: typeof o.gymName === "string" ? o.gymName : null,
    profileImageUrl:
      typeof o.profileImageUrl === "string" ? o.profileImageUrl : null,
  };
}

export type PublicResultMatchRow = {
  fighterId: string;
  fighterSnapshot: unknown;
  opponentSnapshot: unknown;
  result: MatchRecordOutcome;
};

export type PublicResultCornerMatch = {
  fighterRedId: string | null;
  fighterBlueId: string | null;
};

function applyRepSnapshotFallback(input: {
  fighterRedId: string | null;
  fighterBlueId: string | null;
  rows: PublicResultMatchRow[];
  redFighter: PublicRecordFighterDTO | null;
  blueFighter: PublicRecordFighterDTO | null;
}): {
  redFighter: PublicRecordFighterDTO | null;
  blueFighter: PublicRecordFighterDTO | null;
} {
  let { redFighter, blueFighter } = input;
  const { fighterRedId, fighterBlueId, rows } = input;
  if (redFighter && blueFighter) {
    return { redFighter, blueFighter };
  }

  const rep =
    rows.find((row) => row.result === MatchRecordOutcome.win) ?? rows[0];
  if (!rep) return { redFighter, blueFighter };

  const repFighter = parsePublicFighterSnapshot(rep.fighterSnapshot);
  const repOpponent = parsePublicFighterSnapshot(rep.opponentSnapshot);
  if (!repFighter || !repOpponent) return { redFighter, blueFighter };

  if (fighterRedId && repFighter.fighterId === fighterRedId) {
    redFighter = redFighter ?? repFighter;
    blueFighter = blueFighter ?? repOpponent;
  } else if (fighterRedId && repOpponent.fighterId === fighterRedId) {
    redFighter = redFighter ?? repOpponent;
    blueFighter = blueFighter ?? repFighter;
  } else if (fighterBlueId && repFighter.fighterId === fighterBlueId) {
    blueFighter = blueFighter ?? repFighter;
    redFighter = redFighter ?? repOpponent;
  } else if (fighterBlueId && repOpponent.fighterId === fighterBlueId) {
    blueFighter = blueFighter ?? repOpponent;
    redFighter = redFighter ?? repFighter;
  }

  return { redFighter, blueFighter };
}

export function mapPublicResultCorners(input: {
  match: PublicResultCornerMatch;
  rows: PublicResultMatchRow[];
}): {
  redFighter: PublicRecordFighterDTO | null;
  blueFighter: PublicRecordFighterDTO | null;
  winnerId: string | null;
} {
  const { fighterRedId, fighterBlueId } = input.match;

  const redRow = fighterRedId
    ? input.rows.find((row) => row.fighterId === fighterRedId)
    : undefined;
  const blueRow = fighterBlueId
    ? input.rows.find((row) => row.fighterId === fighterBlueId)
    : undefined;

  let redFighter = parsePublicFighterSnapshot(redRow?.fighterSnapshot ?? null);
  let blueFighter = parsePublicFighterSnapshot(blueRow?.fighterSnapshot ?? null);

  ({ redFighter, blueFighter } = applyRepSnapshotFallback({
    fighterRedId,
    fighterBlueId,
    rows: input.rows,
    redFighter,
    blueFighter,
  }));

  const winRow = input.rows.find(
    (row) => row.result === MatchRecordOutcome.win,
  );
  const winnerId = winRow?.fighterId ?? null;

  return { redFighter, blueFighter, winnerId };
}
