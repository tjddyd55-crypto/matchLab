/** 라운드 수 1R ~ 12R */
export const MATCH_ROUND_COUNT_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

/** 라운드 시간 1:00 ~ 5:00 (30초 단위) */
export const MATCH_ROUND_TIME_SEC_OPTIONS = Array.from(
  { length: 9 },
  (_, i) => 60 + i * 30,
);

export function formatRoundTimeLabel(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatRoundCountLabel(roundCount: number): string {
  return `${roundCount}R`;
}
