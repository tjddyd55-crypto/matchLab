import type { ApplicantExcelExportRow } from "@/lib/applications/applicant-excel-export-fields";

/** 종료 당시 대회 기본정보 — UI 표시값 중심 */
export type EventArchiveEventSnapshot = {
  eventId: string;
  title: string;
  eventDateLabel: string;
  locationLabel: string;
  organizerName: string;
  statusLabel: string;
  registrationPeriodLabel: string;
  publicSlug: string;
};

/** BracketMatch 1건 — match 단위 독립 snapshot (복수 경기 dedupe 금지) */
export type EventArchiveBracketMatchSnapshot = {
  matchId: string;
  bracketId: string;
  bracketTitle: string;
  matchNumber: number | null;
  globalMatchOrder: number | null;
  matchOrder: number;
  round: number | null;
  roundName: string | null;
  divisionLabel: string | null;
  courtName: string | null;
  matNumber: number | null;
  red: EventArchiveCornerSnapshot | null;
  blue: EventArchiveCornerSnapshot | null;
  status: string;
  statusLabel: string;
  winnerId: string | null;
  winnerName: string | null;
  loserId: string | null;
  loserName: string | null;
  resultType: string | null;
  resultTypeLabel: string | null;
  resultMemo: string | null;
  organizerMemo: string | null;
  matchWeightKg: number | null;
  nextMatchId: string | null;
  nextMatchSlot: string | null;
  hasOfficialResults: boolean;
};

export type EventArchiveCornerSnapshot = {
  fighterId: string | null;
  name: string;
  gymName: string | null;
  recordSummary: string | null;
};

export type EventArchiveBracketSnapshot = {
  matches: EventArchiveBracketMatchSnapshot[];
  divisionCount: number;
  totalMatchCount: number;
};

/** MatchResult 1행 — confirmed/corrected 기준 */
export type EventArchiveResultRowSnapshot = {
  resultId: string;
  matchId: string;
  matchNumber: number | null;
  bracketTitle: string;
  divisionLabel: string | null;
  fighterId: string;
  fighterName: string;
  fighterGymName: string | null;
  opponentId: string | null;
  opponentName: string | null;
  opponentGymName: string | null;
  result: string;
  resultLabel: string;
  resultType: string | null;
  resultTypeLabel: string | null;
  status: string;
  statusLabel: string;
  matchDateLabel: string | null;
};

export type EventArchiveResultsSnapshot = {
  rows: EventArchiveResultRowSnapshot[];
  totalCount: number;
};

export type EventArchiveApplicantsSnapshot = {
  rows: ApplicantExcelExportRow[];
  totalCount: number;
  participantCount: number;
};

export type EventArchiveFinishSummary = {
  applicantCount: number;
  totalMatchCount: number;
  completedMatchCount: number;
  pendingMatchCount: number;
  divisionCount: number;
};

export type EventArchiveSummaryStats = {
  applicantCount: number;
  participantCount: number;
  totalMatchCount: number;
  completedMatchCount: number;
  divisionCount: number;
  archivedAt: string;
  version: number;
};

/** 공개 projection용 — 개인정보 제외 필드만 */
export type EventArchivePublicApplicantRow = {
  applicationId: string;
  fighterName: string;
  gymName: string;
  genderLabel: string;
  divisionLabel: string;
  recordText: string | null;
  statusLabel: string;
};

export function projectPublicApplicantRows(
  rows: ApplicantExcelExportRow[],
  extractLabels: (row: ApplicantExcelExportRow) => {
    genderLabel: string;
    statusLabel: string;
    divisionLabel: string;
  },
): EventArchivePublicApplicantRow[] {
  return rows.map((row) => {
    const labels = extractLabels(row);
    return {
      applicationId: row.applicationId,
      fighterName: row.fighterName,
      gymName: row.gymName,
      genderLabel: labels.genderLabel,
      divisionLabel: labels.divisionLabel,
      recordText: row.recordText,
      statusLabel: labels.statusLabel,
    };
  });
}

export function measureSnapshotBytes(snapshots: {
  eventSnapshot: unknown;
  applicantsSnapshot: unknown;
  bracketSnapshot: unknown;
  resultsSnapshot: unknown;
}): {
  eventBytes: number;
  applicantsBytes: number;
  bracketBytes: number;
  resultsBytes: number;
  totalBytes: number;
} {
  const enc = (v: unknown) => Buffer.byteLength(JSON.stringify(v), "utf8");
  const eventBytes = enc(snapshots.eventSnapshot);
  const applicantsBytes = enc(snapshots.applicantsSnapshot);
  const bracketBytes = enc(snapshots.bracketSnapshot);
  const resultsBytes = enc(snapshots.resultsSnapshot);
  return {
    eventBytes,
    applicantsBytes,
    bracketBytes,
    resultsBytes,
    totalBytes: eventBytes + applicantsBytes + bracketBytes + resultsBytes,
  };
}
