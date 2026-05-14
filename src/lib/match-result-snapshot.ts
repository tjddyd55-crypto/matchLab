import {
  formatDivisionNameLabel,
  formatRecordSummary,
  type BracketFighterSnapshotPayload,
} from "@/lib/bracket-snapshot";
import type { BracketMatchOutcomeStyle, MatchRecordStatus } from "@/lib/enums";

/** MatchResult.fighterSnapshot — 클라이언트 입력 불신, 서버 조립 */
export type MatchResultFighterSnapshotJson = {
  fighterId: string;
  fighterCode: string;
  name: string;
  gymName: string | null;
  profileImageUrl: string | null;
  recordSummaryBeforeMatch: string;
};

/** MatchResult.opponentSnapshot — 전적 요약 제외 */
export type MatchResultOpponentSnapshotJson = {
  fighterId: string;
  fighterCode: string;
  name: string;
  gymName: string | null;
  profileImageUrl: string | null;
};

export type MatchResultDivisionSnapshotJson = {
  divisionId: string | null;
  sportType: string | null;
  ruleType: string | null;
  gender: string | null;
  ageGroup: string | null;
  weightClass: string | null;
  skillLevel: string | null;
  label: string;
};

export function buildMatchResultFighterSnapshotJson(row: {
  id: string;
  fighterCode: string;
  name: string;
  profileImageUrl: string | null;
  recordWin: number;
  recordLoss: number;
  recordDraw: number;
  gymName: string | null;
}): MatchResultFighterSnapshotJson {
  return {
    fighterId: row.id,
    fighterCode: row.fighterCode,
    name: row.name,
    gymName: row.gymName,
    profileImageUrl: row.profileImageUrl,
    recordSummaryBeforeMatch: formatRecordSummary(row),
  };
}

export function buildMatchResultOpponentSnapshotJson(row: {
  id: string;
  fighterCode: string;
  name: string;
  profileImageUrl: string | null;
  gymName: string | null;
}): MatchResultOpponentSnapshotJson {
  return {
    fighterId: row.id,
    fighterCode: row.fighterCode,
    name: row.name,
    gymName: row.gymName,
    profileImageUrl: row.profileImageUrl,
  };
}

export function buildMatchResultDivisionSnapshotJson(
  division:
    | {
        id: string | null;
        sportType: string | null;
        ruleType: string | null;
        gender: string | null;
        ageGroup: string | null;
        weightClass: string | null;
        skillLevel: string | null;
      }
    | null
    | undefined,
): MatchResultDivisionSnapshotJson | null {
  if (!division?.id) return null;
  const label = formatDivisionNameLabel(division);
  return {
    divisionId: division.id,
    sportType: division.sportType,
    ruleType: division.ruleType,
    gender: division.gender,
    ageGroup: division.ageGroup,
    weightClass: division.weightClass,
    skillLevel: division.skillLevel,
    label,
  };
}

export function buildAdvanceWinnerBracketSnapshot(params: {
  fighterRow: {
    id: string;
    fighterCode: string;
    name: string;
    profileImageUrl: string | null;
    recordWin: number;
    recordLoss: number;
    recordDraw: number;
    gymName: string | null;
  };
  divisionLabel: string | null;
}): BracketFighterSnapshotPayload {
  return {
    fighterId: params.fighterRow.id,
    fighterCode: params.fighterRow.fighterCode,
    name: params.fighterRow.name,
    gymName: params.fighterRow.gymName,
    profileImageUrl: params.fighterRow.profileImageUrl,
    recordSummary: formatRecordSummary(params.fighterRow),
    divisionName: params.divisionLabel,
  };
}

const outcomeStyleLabels: Record<BracketMatchOutcomeStyle, string> = {
  decision: "판정",
  ko: "KO",
  tko: "TKO",
  submission: "서브미션",
  disqualification: "실격",
  walkover: "부전승",
  forfeit: "기권",
  draw: "무승부",
  no_contest: "노콘테스트",
};

export function outcomeStylePublicLabel(
  style: BracketMatchOutcomeStyle | null | undefined,
): string | null {
  if (!style) return null;
  return outcomeStyleLabels[style] ?? String(style);
}

export function matchRecordStatusKo(s: MatchRecordStatus): string {
  switch (s) {
    case "pending":
      return "임시";
    case "confirmed":
      return "확정";
    case "corrected":
      return "정정";
    case "voided":
      return "무효";
    default:
      return String(s);
  }
}
