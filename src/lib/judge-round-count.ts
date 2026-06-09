/** 종목별 기본 라운드 수 — 경기에 roundCount가 없을 때 사용 */
export function defaultRoundCountForSport(sportType: string | null | undefined): number {
  const s = sportType?.trim().toLowerCase() ?? "";
  if (s.includes("boxing")) return 3;
  if (s.includes("kick")) return 3;
  if (s.includes("muay")) return 3;
  return 3;
}

export const JUDGE_COUNT_POLICY_LINES = [
  "심판은 3명 또는 5명을 권장합니다.",
  "짝수 심판은 동점이 발생할 수 있으므로 최종 확정은 주최자 또는 주심이 진행합니다.",
  "심판 채점 결과는 최종 결과 확정을 위한 참고 데이터입니다.",
] as const;

export const ALLOWED_JUDGE_COUNTS = [1, 2, 3, 4, 5] as const;
