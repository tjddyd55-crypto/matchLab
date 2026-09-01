import type { BracketMatchOutcomeStyle, MatchRecordOutcome } from "@/lib/enums";
import { MatchRecordStatus } from "@/lib/enums";
import { outcomeStylePublicLabel } from "@/lib/match-result-snapshot";

/** 외부 공개 화면에서 공식 경기 결과로 인정하는 MatchResult 상태 SSOT */
export const PUBLIC_OFFICIAL_MATCH_RESULT_STATUSES: MatchRecordStatus[] = [
  MatchRecordStatus.confirmed,
  MatchRecordStatus.corrected,
];

const OUTCOME_LABEL: Record<MatchRecordOutcome, string> = {
  win: "승",
  loss: "패",
  draw: "무",
  no_contest: "무효",
};

export function hasOfficialMatchResults(
  matchResults: { status?: MatchRecordStatus }[] | null | undefined,
): boolean {
  const official = (matchResults ?? []).filter((row) =>
    row.status != null &&
    PUBLIC_OFFICIAL_MATCH_RESULT_STATUSES.includes(row.status),
  );
  return official.length >= 2;
}

export function buildPublicFighterOutcomeLabel(
  perspectiveFighterId: string,
  match: {
    winnerId: string | null;
    loserId: string | null;
    matchResults: {
      fighterId: string;
      result: MatchRecordOutcome;
      status?: MatchRecordStatus;
    }[];
  },
): string | null {
  const official = (match.matchResults ?? []).filter(
    (row) =>
      row.status != null &&
      PUBLIC_OFFICIAL_MATCH_RESULT_STATUSES.includes(row.status),
  );
  if (official.length < 2) return null;

  const mine = official.find((row) => row.fighterId === perspectiveFighterId);
  if (!mine) return null;
  return OUTCOME_LABEL[mine.result] ?? null;
}

export function buildPublicResultTypeLabel(
  matchResults: {
    status?: MatchRecordStatus;
    result?: MatchRecordOutcome;
    resultType?: BracketMatchOutcomeStyle | null;
  }[],
  bracketResultType: BracketMatchOutcomeStyle | null,
): string | null {
  const official = matchResults.filter(
    (row) =>
      row.status != null &&
      PUBLIC_OFFICIAL_MATCH_RESULT_STATUSES.includes(row.status),
  );
  if (official.length < 2) return null;

  const winnerRow = official.find((row) => row.result === "win");
  const type = winnerRow?.resultType ?? bracketResultType;
  return type ? (outcomeStylePublicLabel(type) ?? null) : null;
}

/** 공개 대진·관람용 종료 경기 결과 문구 */
export function buildPublicFinishedResultLabel(hasOfficial: boolean): string {
  return hasOfficial ? "경기 종료" : "경기 종료 · 결과 확인 중";
}
