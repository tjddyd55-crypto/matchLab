import { buildRecordText, parseRecordText } from "@/lib/fighter/record";
import type { OrganizerBracketMatchVM } from "@/lib/services/bracket.service";
import {
  formatMatchOrderShort,
  sortMatchesByOrder,
} from "@/lib/match-order-display";

export type FighterCornerAssignment = {
  matchId: string;
  matchLabel: string;
  corner: "홍코너" | "청코너";
  cornerShort: "R" | "B";
};

/** event/bracket 내 선수별 코너 배정 목록 (경기 순서) */
export function buildFighterAssignmentMap(
  matches: OrganizerBracketMatchVM[],
): Map<string, FighterCornerAssignment[]> {
  const map = new Map<string, FighterCornerAssignment[]>();
  const sorted = sortMatchesByOrder(matches);

  for (const m of sorted) {
    const matchLabel = formatMatchOrderShort(m);
    if (m.fighterRedId) {
      const list = map.get(m.fighterRedId) ?? [];
      list.push({
        matchId: m.id,
        matchLabel,
        corner: "홍코너",
        cornerShort: "R",
      });
      map.set(m.fighterRedId, list);
    }
    if (m.fighterBlueId) {
      const list = map.get(m.fighterBlueId) ?? [];
      list.push({
        matchId: m.id,
        matchLabel,
        corner: "청코너",
        cornerShort: "B",
      });
      map.set(m.fighterBlueId, list);
    }
  }

  return map;
}

export function getFighterAssignments(
  assignmentMap: Map<string, FighterCornerAssignment[]>,
  fighterId: string,
): FighterCornerAssignment[] {
  return assignmentMap.get(fighterId) ?? [];
}

/** 슬롯 select / dropdown용 배정 상태 텍스트 */
export function formatAssignmentSummary(
  assignments: FighterCornerAssignment[],
  opts?: {
    currentMatchId?: string;
    isCurrentSelection?: boolean;
  },
): string {
  if (opts?.isCurrentSelection) {
    const inCurrent = assignments.filter(
      (a) => a.matchId === opts.currentMatchId,
    );
    if (inCurrent.length > 0) {
      if (assignments.length === 1) {
        return `현재 선택 · ${inCurrent[0]!.matchLabel} ${inCurrent[0]!.corner}`;
      }
      return `현재 선택 · ${formatAssignmentParts(inCurrent)}`;
    }
    return "현재 선택";
  }

  if (assignments.length === 0) return "미배정";
  if (assignments.length === 1) {
    const a = assignments[0]!;
    return `${a.matchLabel} ${a.corner}`;
  }
  if (assignments.length === 2) {
    return formatAssignmentParts(assignments);
  }
  return `배정 ${assignments.length}건 (${assignments.map((a) => `${a.matchLabel.replace("경기", "")}${a.cornerShort}`).join("/")})`;
}

function formatAssignmentParts(assignments: FighterCornerAssignment[]): string {
  return assignments
    .map((a) => `${a.matchLabel.replace("경기", "")} ${a.cornerShort === "R" ? "홍" : "청"}`)
    .join(" / ");
}

function compactSingleAssignment(a: FighterCornerAssignment): string {
  return `${a.matchLabel} ${a.cornerShort === "R" ? "홍" : "청"}`;
}

function formatAssignmentPartsCompact(
  assignments: FighterCornerAssignment[],
): string {
  return assignments
    .map(
      (a) =>
        `${a.matchLabel.replace("경기", "")}${a.cornerShort === "R" ? "홍" : "청"}`,
    )
    .join(" / ");
}

/** picker 상태 column — compact fixed width */
export function formatAssignmentSummaryCompact(
  assignments: FighterCornerAssignment[],
  opts?: {
    currentMatchId?: string;
    isCurrentSelection?: boolean;
  },
): string {
  if (opts?.isCurrentSelection) {
    const inCurrent = assignments.filter(
      (a) => a.matchId === opts.currentMatchId,
    );
    if (inCurrent.length === 1) {
      return `현재 · ${compactSingleAssignment(inCurrent[0]!)}`;
    }
    if (inCurrent.length > 1) {
      return `현재 · ${formatAssignmentPartsCompact(inCurrent)}`;
    }
    return "현재 선택";
  }

  if (assignments.length === 0) return "미배정";
  if (assignments.length === 1) return compactSingleAssignment(assignments[0]!);
  if (assignments.length === 2) {
    return formatAssignmentPartsCompact(assignments);
  }
  return `배정 ${assignments.length}건`;
}

export type PickerOptionColumns = {
  status: string;
  fighterName: string;
  gymName: string;
  divisionLabel: string;
  weightLabel: string;
  recordLabel: string;
  isOtherDivision: boolean;
  isEligibleForBracket: boolean;
};

export function buildPickerOptionColumns(
  option: {
    fighterName: string;
    gymName: string;
    currentDivisionLabel: string;
    appliedDivisionLabel: string;
    applicationWeightKg: number | null;
    recordSummary: string;
    isOtherDivision: boolean;
    isEligibleForBracket: boolean;
  },
  status: string,
): PickerOptionColumns {
  const divisionLabel =
    option.appliedDivisionLabel &&
    option.appliedDivisionLabel !== option.currentDivisionLabel
      ? option.appliedDivisionLabel
      : option.currentDivisionLabel || "-";

  return {
    status,
    fighterName: option.fighterName,
    gymName: option.gymName,
    divisionLabel,
    weightLabel:
      option.applicationWeightKg != null
        ? `${option.applicationWeightKg}kg`
        : "-",
    recordLabel: formatBracketCandidateRecordLabel(option.recordSummary) ?? "-",
    isOtherDivision: option.isOtherDivision,
    isEligibleForBracket: option.isEligibleForBracket,
  };
}

export type BracketCandidateWeightRecordDisplay = {
  weightText?: string;
  recordText?: string;
};

/** 후보 카드·빠른 배정 — formatRecordSummary("N승 N패 N무") → buildRecordText 표준 */
export function formatBracketCandidateRecordLabel(
  recordSummary: string,
): string | undefined {
  const trimmed = recordSummary.trim();
  if (!trimmed) return undefined;
  const parsed = parseRecordText(trimmed);
  if (parsed.ok) return parsed.recordText;
  const totalOnly = trimmed.match(/^(\d+)\s*전$/);
  if (totalOnly) return trimmed;
  const winsLossesDraws = trimmed.match(/^(\d+)\s*승\s*(\d+)\s*패\s*(\d+)\s*무$/);
  if (winsLossesDraws) {
    const wins = Number(winsLossesDraws[1]);
    const losses = Number(winsLossesDraws[2]);
    const draws = Number(winsLossesDraws[3]);
    return buildRecordText({
      totalBouts: wins + losses + draws,
      wins,
      draws,
      losses,
    });
  }
  return trimmed.replace(/\s+/g, "");
}

export function buildBracketCandidateWeightRecordDisplay(input: {
  applicationWeightKg: number | null;
  recordSummary: string;
}): BracketCandidateWeightRecordDisplay | undefined {
  const weightText =
    input.applicationWeightKg != null
      ? `${input.applicationWeightKg}kg`
      : undefined;
  const recordText = formatBracketCandidateRecordLabel(input.recordSummary);
  if (!weightText && !recordText) return undefined;
  return { weightText, recordText };
}

/** picker option 정렬 tier (낮을수록 위) */
export function getPickerOptionSortTier(input: {
  fighterId: string;
  activeFighterId: string;
  isOtherDivision: boolean;
  assignmentCount: number;
}): number {
  if (input.fighterId === input.activeFighterId) return 0;
  if (input.assignmentCount === 0 && !input.isOtherDivision) return 1;
  if (input.assignmentCount > 0 && !input.isOtherDivision) return 2;
  if (input.assignmentCount === 0 && input.isOtherDivision) return 3;
  return 4;
}
