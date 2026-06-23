import type { OrganizerApprovedFighterOptionVM } from "@/lib/services/bracket.service";
import type { OrganizerBracketMatchVM } from "@/lib/services/bracket.service";

export type FighterPickerOptionState = {
  fighterId: string;
  selectable: boolean;
  reason?: string;
  warningReason?: string;
  statusHint?: string;
};

export function buildFighterPickerOptionStates(input: {
  options: OrganizerApprovedFighterOptionVM[];
  matches: OrganizerBracketMatchVM[];
  matchId: string;
  slot: "red" | "blue";
  currentFighterId: string;
}): Map<string, FighterPickerOptionState> {
  const { options, matches, matchId, slot, currentFighterId } = input;
  const result = new Map<string, FighterPickerOptionState>();

  const currentMatch = matches.find((m) => m.id === matchId);
  const oppositeId =
    slot === "red"
      ? currentMatch?.fighterBlueId ?? ""
      : currentMatch?.fighterRedId ?? "";

  for (const opt of options) {
    const states: string[] = [];
    let selectable = true;
    let reason: string | undefined;
    let warningReason: string | undefined;

    if (opt.fighterId === oppositeId) {
      selectable = false;
      reason = "같은 경기 반대 코너에 이미 배정되어 있습니다.";
    }

    if (!opt.isAssignableForBracket) {
      selectable = false;
      reason =
        reason ??
        opt.assignabilityDisabledReason ??
        opt.assignabilityLabel;
    } else if (opt.assignabilityWarningReason) {
      warningReason = opt.assignabilityWarningReason;
    }

    const other = findFighterPlacement(matches, opt.fighterId, matchId);
    if (other) {
      states.push(`${other.label} 배정`);
      if (opt.fighterId !== currentFighterId && selectable) {
        reason =
          reason ??
          `다른 경기 ${other.label} 배정 — 선택 시 기존 슬롯은 비워집니다`;
      }
    }

    result.set(opt.fighterId, {
      fighterId: opt.fighterId,
      selectable: selectable || opt.fighterId === currentFighterId,
      reason,
      warningReason,
      statusHint: states.length > 0 ? states.join(" · ") : undefined,
    });
  }

  return result;
}

function findFighterPlacement(
  matches: OrganizerBracketMatchVM[],
  fighterId: string,
  excludeMatchId: string,
): { matchId: string; label: string } | null {
  for (const m of matches) {
    if (m.id === excludeMatchId) continue;
    if (m.fighterRedId === fighterId) {
      return { matchId: m.id, label: "홍코너" };
    }
    if (m.fighterBlueId === fighterId) {
      return { matchId: m.id, label: "청코너" };
    }
  }
  return null;
}

export function fighterNeedsMoveConfirm(
  matches: OrganizerBracketMatchVM[],
  fighterId: string,
  excludeMatchId: string,
): boolean {
  return findFighterPlacement(matches, fighterId, excludeMatchId) !== null;
}
