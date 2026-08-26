import "server-only";

import type { Prisma } from "@/generated/prisma";
import {
  buildFighterBracketSnapshot,
  type BracketFighterSnapshotSource,
} from "@/lib/bracket-snapshot";
import {
  bracketRepository,
  type ApprovedApplicationForBracketRow,
} from "@/lib/repositories/bracket.repository";

function toBracketSnapshotSource(
  row: ApprovedApplicationForBracketRow,
): BracketFighterSnapshotSource {
  return {
    fighter: row.fighter,
    gym: row.gym,
    gymSnapshot: row.gymSnapshot,
    gymNameSnapshot: row.gymNameSnapshot,
    division: row.division ?? {
      sportType: null,
      ruleType: null,
      gender: null,
      ageGroup: null,
      weightClass: null,
      weightClassName: null,
      weightLimitText: null,
      skillLevel: null,
    },
  };
}

/**
 * EventApplication·Fighter 프로필 수정 후, 해당 선수가 배정된 BracketMatch
 * fighterRed/BlueSnapshot만 재생성한다. matchNumber·court·slot·weight·memo는 유지.
 */
export async function resyncFighterMatchSnapshotsForEvent(
  eventId: string,
  fighterId: string,
  tx: Prisma.TransactionClient,
): Promise<{ updatedMatchCount: number }> {
  const matches = await bracketRepository.listActiveMatchesForFighterInEvent(
    eventId,
    fighterId,
    tx,
  );
  if (matches.length === 0) {
    return { updatedMatchCount: 0 };
  }

  const row = await bracketRepository.findApprovedApplicationForEventPlacement(
    eventId,
    fighterId,
    tx,
  );
  if (!row) {
    return { updatedMatchCount: 0 };
  }

  const snap = buildFighterBracketSnapshot(toBracketSnapshotSource(row));

  for (const match of matches) {
    const patch: Prisma.BracketMatchUncheckedUpdateInput = {};
    if (match.fighterRedId === fighterId) {
      patch.fighterRedSnapshot = snap;
    }
    if (match.fighterBlueId === fighterId) {
      patch.fighterBlueSnapshot = snap;
    }
    if (Object.keys(patch).length === 0) continue;
    await bracketRepository.updateBracketMatch(match.id, patch, tx);
  }

  return { updatedMatchCount: matches.length };
}
