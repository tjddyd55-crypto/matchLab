import type { EventDivisionDisplayInput } from "@/lib/event-division-fields";
import { formatDivisionMainLabel } from "@/lib/event-division-fields";
import { normalizeGymName } from "@/lib/brackets/gym-match-key";
import { weightDiffKgOrNull } from "@/lib/brackets/record-auto-match";

export type ManualMatchPairSide = {
  fighterId: string;
  fighterName: string;
  gymName: string;
  divisionId: string | null;
  currentDivisionLabel: string;
  applicationWeightKg: number | null;
  recordSummary: string;
  fighterGender: string | null;
};

export type ManualPairWarning = {
  label: string;
};

export function buildManualPairWarnings(input: {
  red: ManualMatchPairSide;
  blue: ManualMatchPairSide;
  targetDivisionId: string | null;
  targetDivisionLabel: string | null;
  targetDivisionGender: string | null;
}): ManualPairWarning[] {
  const warnings: ManualPairWarning[] = [];
  const { red, blue, targetDivisionId, targetDivisionLabel, targetDivisionGender } =
    input;

  if (
    normalizeGymName(red.gymName) &&
    normalizeGymName(red.gymName) === normalizeGymName(blue.gymName)
  ) {
    warnings.push({ label: "동일 체육관" });
  }

  for (const side of [red, blue]) {
    if (
      targetDivisionId &&
      side.divisionId &&
      side.divisionId !== targetDivisionId
    ) {
      warnings.push({
        label: `경기구분 다름 (${side.currentDivisionLabel} → ${targetDivisionLabel ?? "현재 그룹"})`,
      });
    }
  }

  const targetGender = (targetDivisionGender ?? "").trim();
  if (targetGender) {
    for (const side of [red, blue]) {
      const fg = (side.fighterGender ?? "").trim();
      if (fg && fg !== targetGender) {
        warnings.push({ label: "성별 다름" });
        break;
      }
    }
  }

  const weightDiff = weightDiffKgOrNull(red, blue);
  if (weightDiff != null) {
    const rounded = Math.round(weightDiff * 10) / 10;
    warnings.push({ label: `체중 차이 ${rounded}kg` });
  }

  return warnings;
}

export function fightersRequiringDivisionMove(
  red: Pick<ManualMatchPairSide, "fighterId" | "divisionId">,
  blue: Pick<ManualMatchPairSide, "fighterId" | "divisionId">,
  targetDivisionId: string | null,
): Array<Pick<ManualMatchPairSide, "fighterId" | "divisionId">> {
  if (!targetDivisionId) return [];
  return [red, blue].filter(
    (side) => side.divisionId != null && side.divisionId !== targetDivisionId,
  );
}

export function buildCrossDivisionManualMatchDescription(input: {
  red: ManualMatchPairSide;
  blue: ManualMatchPairSide;
  targetDivisionLabel: string;
  moveFighters: ManualMatchPairSide[];
  warnings: ManualPairWarning[];
}): string {
  return buildManualMatchConfirmDescription({
    red: input.red,
    blue: input.blue,
    targetDivisionLabel: input.targetDivisionLabel,
    moveFighters: input.moveFighters,
    warnings: input.warnings,
  });
}

export type ManualMatchConfirmSideDisplay = {
  cornerLabel: "홍코너" | "청코너";
  gymName: string;
  fighterName: string;
  weightText: string;
  recordText: string;
};

export function formatManualMatchWeightText(
  applicationWeightKg: number | null,
): string {
  if (applicationWeightKg == null) return "체중 정보 없음";
  return `${applicationWeightKg}kg`;
}

export function formatManualMatchRecordText(recordSummary: string): string {
  const trimmed = recordSummary.trim();
  if (!trimmed) return "전적 정보 없음";
  return trimmed.replace(/\s+/g, "");
}

export function buildManualMatchConfirmSideDisplay(
  cornerLabel: "홍코너" | "청코너",
  side: ManualMatchPairSide,
): ManualMatchConfirmSideDisplay {
  return {
    cornerLabel,
    gymName: side.gymName,
    fighterName: side.fighterName,
    weightText: formatManualMatchWeightText(side.applicationWeightKg),
    recordText: formatManualMatchRecordText(side.recordSummary),
  };
}

export function formatManualMatchConfirmSideBlock(
  display: ManualMatchConfirmSideDisplay,
): string {
  return [
    display.cornerLabel,
    "",
    `${display.gymName} · ${display.fighterName}`,
    `${display.weightText} · ${display.recordText}`,
  ].join("\n");
}

export function buildManualMatchConfirmDescription(input: {
  red: ManualMatchPairSide;
  blue: ManualMatchPairSide;
  targetDivisionLabel: string;
  moveFighters: ManualMatchPairSide[];
  warnings: ManualPairWarning[];
}): string {
  const lines = [
    formatManualMatchConfirmSideBlock(
      buildManualMatchConfirmSideDisplay("홍코너", input.red),
    ),
    "",
    formatManualMatchConfirmSideBlock(
      buildManualMatchConfirmSideDisplay("청코너", input.blue),
    ),
    "",
  ];

  if (input.moveFighters.length > 0) {
    for (const mover of input.moveFighters) {
      lines.push(
        `${mover.fighterName} 선수는 현재 「${mover.currentDivisionLabel}」에 배정되어 있습니다.`,
      );
      lines.push(
        `이 경기를 만들면 ${mover.fighterName} 선수를 「${input.targetDivisionLabel}」으로 이동한 뒤 경기를 생성합니다.`,
      );
      lines.push("");
    }
    lines.push("원래 신청정보는 변경되지 않습니다.");
  } else {
    lines.push("두 선수로 새 경기를 생성합니다.");
  }

  if (input.warnings.length > 0) {
    lines.push("");
    for (const w of input.warnings) {
      lines.push(`⚠ ${w.label}`);
    }
  }

  return lines
    .filter((line, idx, arr) => line !== "" || arr[idx + 1] !== "")
    .join("\n");
}

export function formatFighterDivisionLabel(
  division: EventDivisionDisplayInput | null | undefined,
): string {
  if (!division) return "체급 미지정";
  return formatDivisionMainLabel(division);
}
