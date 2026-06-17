import type { MatchOperationalSettings } from "@/lib/match-operational-settings";

/** 경기 운영 설정 기준 실제 채점·표시 라운드 수 (연장 포함) */
export function effectiveScoringRoundCount(settings: {
  roundCount: number;
  overtimeEnabled: boolean;
  overtimeRoundCount: number;
}): number {
  const base = Math.max(1, settings.roundCount);
  if (!settings.overtimeEnabled || settings.overtimeRoundCount <= 0) {
    return base;
  }
  return base + settings.overtimeRoundCount;
}

export function effectiveScoringRoundCountFromOps(
  ops: MatchOperationalSettings,
): number {
  return effectiveScoringRoundCount(ops);
}

export function roundWinnerLabel(
  redScore: number | null,
  blueScore: number | null,
): "red" | "blue" | "draw" | null {
  if (redScore == null || blueScore == null) return null;
  if (redScore > blueScore) return "red";
  if (blueScore > redScore) return "blue";
  return "draw";
}
