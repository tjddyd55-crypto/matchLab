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
  const lines = [
    `${input.red.fighterName}`,
    `${input.red.currentDivisionLabel}`,
    input.red.applicationWeightKg != null
      ? `${input.red.applicationWeightKg}kg`
      : "",
    "",
    "VS",
    "",
    `${input.blue.fighterName}`,
    `${input.blue.currentDivisionLabel}`,
    input.blue.applicationWeightKg != null
      ? `${input.blue.applicationWeightKg}kg`
      : "",
    "",
  ];

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

  if (input.warnings.length > 0) {
    lines.push("");
    for (const w of input.warnings) {
      lines.push(`⚠ ${w.label}`);
    }
  }

  return lines.filter((line, idx, arr) => line !== "" || arr[idx + 1] !== "").join("\n");
}

export function formatFighterDivisionLabel(
  division: EventDivisionDisplayInput | null | undefined,
): string {
  if (!division) return "체급 미지정";
  return formatDivisionMainLabel(division);
}
