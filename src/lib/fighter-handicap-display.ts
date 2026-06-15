import type {
  CheckInStatus,
  WeighInFailureResolution,
  WeighInStatus,
} from "@/generated/prisma";

export type FighterHandicapDisplay = {
  badgeLabel: string | null;
  note: string | null;
};

export type FighterHandicapSource = {
  weighInStatus: WeighInStatus;
  weighInFailureResolution: WeighInFailureResolution;
  handicapNote: string | null;
  checkInStatus: CheckInStatus;
  disqualificationReason: string | null;
};

export function resolveFighterHandicapDisplay(
  input: FighterHandicapSource,
): FighterHandicapDisplay {
  if (input.checkInStatus === "disqualified") {
    return {
      badgeLabel: "실격",
      note: input.disqualificationReason?.trim() || null,
    };
  }

  if (
    (input.weighInStatus === "fail" || input.weighInStatus === "manual_fail") &&
    input.weighInFailureResolution === "proceed_with_handicap"
  ) {
    return {
      badgeLabel: "계체 실패 · 경기진행",
      note: input.handicapNote?.trim() || null,
    };
  }

  if (
    (input.weighInStatus === "fail" || input.weighInStatus === "manual_fail") &&
    input.weighInFailureResolution === "cancel_match"
  ) {
    return {
      badgeLabel: "계체 실패 · 경기취소",
      note: null,
    };
  }

  return { badgeLabel: null, note: null };
}

export type FighterHandicapMapEntry = FighterHandicapDisplay;

export function buildFighterHandicapMap(
  rows: {
    fighterId: string;
    weighInStatus: WeighInStatus;
    weighInFailureResolution: WeighInFailureResolution;
    handicapNote: string | null;
    checkInStatus: CheckInStatus;
    disqualificationReason: string | null;
  }[],
): Map<string, FighterHandicapMapEntry> {
  const map = new Map<string, FighterHandicapMapEntry>();
  for (const row of rows) {
    map.set(
      row.fighterId,
      resolveFighterHandicapDisplay({
        weighInStatus: row.weighInStatus,
        weighInFailureResolution: row.weighInFailureResolution,
        handicapNote: row.handicapNote,
        checkInStatus: row.checkInStatus,
        disqualificationReason: row.disqualificationReason,
      }),
    );
  }
  return map;
}
