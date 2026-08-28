import type { OrganizerApprovedFighterOptionVM } from "@/lib/services/bracket.service";
import type { OrganizerBracketMatchVM } from "@/lib/services/bracket.service";
import {
  buildFighterAssignmentMap,
  formatAssignmentSummary,
  formatAssignmentSummaryCompact,
  getFighterAssignments,
} from "@/lib/bracket-fighter-assignment";

export type FighterPickerOptionState = {
  fighterId: string;
  selectable: boolean;
  reason?: string;
  warningReason?: string;
  /** @deprecated assignmentSummary 사용 */
  statusHint?: string;
  assignmentSummary: string;
  /** picker grid 상태 column */
  pickerStatus: string;
  assignmentCount: number;
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
  const assignmentMap = buildFighterAssignmentMap(matches);

  const currentMatch = matches.find((m) => m.id === matchId);
  const oppositeId =
    slot === "red"
      ? currentMatch?.fighterBlueId ?? ""
      : currentMatch?.fighterRedId ?? "";

  for (const opt of options) {
    const assignments = getFighterAssignments(assignmentMap, opt.fighterId);
    const isCurrentSelection = opt.fighterId === currentFighterId;
    const assignmentSummary = formatAssignmentSummary(assignments, {
      currentMatchId: matchId,
      isCurrentSelection,
    });
    const pickerStatus = formatAssignmentSummaryCompact(assignments, {
      currentMatchId: matchId,
      isCurrentSelection,
    });

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

    const otherAssignments = assignments.filter((a) => a.matchId !== matchId);
    if (otherAssignments.length > 0) {
      if (opt.fighterId !== currentFighterId && selectable) {
        warningReason =
          warningReason ??
          `다른 경기 ${formatAssignmentSummary(otherAssignments)} — 선택 시 기존 배정 유지(복수 출전)`;
      }
    }

    result.set(opt.fighterId, {
      fighterId: opt.fighterId,
      selectable: selectable || opt.fighterId === currentFighterId,
      reason,
      warningReason,
      statusHint: assignmentSummary === "미배정" ? undefined : assignmentSummary,
      assignmentSummary,
      pickerStatus,
      assignmentCount: assignments.length,
    });
  }

  return result;
}

export function fighterNeedsMoveConfirm(
  matches: OrganizerBracketMatchVM[],
  fighterId: string,
  excludeMatchId: string,
): boolean {
  const assignmentMap = buildFighterAssignmentMap(matches);
  const assignments = getFighterAssignments(assignmentMap, fighterId);
  return assignments.some((a) => a.matchId !== excludeMatchId);
}
