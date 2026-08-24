import { parseRecordText } from "@/lib/fighter/record";

export type FightRecordTotalBoutsInput = {
  recordSummary?: string | null;
  recordText?: string | null;
  totalBoutsSnapshot?: number | null;
  winsSnapshot?: number | null;
  drawsSnapshot?: number | null;
  lossesSnapshot?: number | null;
};

/**
 * Filter·표시 공통 totalBouts SSOT.
 * 우선순위: structured totalBouts → N전 parse → 승무패 합계 → 명백한 무전 → unknown(null)
 */
export function resolveFightRecordTotalBouts(
  input: FightRecordTotalBoutsInput | string,
): number | null {
  const normalized =
    typeof input === "string" ? { recordSummary: input } : input;

  if (
    normalized.totalBoutsSnapshot != null &&
    Number.isFinite(normalized.totalBoutsSnapshot)
  ) {
    return normalized.totalBoutsSnapshot;
  }

  const text = (normalized.recordText ?? normalized.recordSummary ?? "").trim();
  if (!text) return null;

  if (/^(무전|0전|0경기)$/.test(text)) return 0;

  const totalOnly = text.match(/^(\d+)\s*전$/);
  if (totalOnly) return Number.parseInt(totalOnly[1]!, 10);

  const parsed = parseRecordText(text);
  if (parsed.ok) return parsed.record.totalBouts;

  const totalInText = text.match(/(\d+)\s*전/);
  if (totalInText) return Number.parseInt(totalInText[1]!, 10);

  const winsLossesDraws = text.match(/^(\d+)\s*승\s*(\d+)\s*패\s*(\d+)\s*무$/);
  if (winsLossesDraws) {
    const wins = Number(winsLossesDraws[1]);
    const losses = Number(winsLossesDraws[2]);
    const draws = Number(winsLossesDraws[3]);
    return wins + losses + draws;
  }

  const wlOnly = text.match(/^(\d+)\s*승\s*(\d+)\s*패$/);
  if (wlOnly) {
    return Number(wlOnly[1]) + Number(wlOnly[2]);
  }

  return null;
}

export type FightRecordExperienceFilter = "all" | "zero" | "experienced";

/** 유전 = totalBouts >= 1, 무전 = totalBouts === 0, unknown은 필터에서 제외 */
export function matchesFightRecordExperienceFilter(
  totalBouts: number | null,
  recordStatus: FightRecordExperienceFilter,
  maxTotalBoutsRaw: string,
): boolean {
  if (recordStatus === "all") return true;
  if (totalBouts == null) return false;
  if (recordStatus === "zero") return totalBouts === 0;
  if (totalBouts < 1) return false;

  const maxRaw = maxTotalBoutsRaw.trim();
  if (!maxRaw) return true;

  const max = Number.parseInt(maxRaw, 10);
  if (!Number.isFinite(max) || max < 1) return false;
  return totalBouts <= max;
}
