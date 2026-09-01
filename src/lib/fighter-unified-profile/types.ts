/**
 * Fighter 전적 SSOT — 3계층 분리 (immutable snapshot 보호)
 *
 * A. 기존/외부 전적 (manual/external)
 *    - Gym 등록·관리 시 수동 입력. MATCHON 이전·외부 대회.
 *    - 별도 external SSOT 필드 예정 (Fighter.record* 사용 금지).
 *
 * B. 대회 신청 당시 snapshot (EventApplication)
 *    - winsSnapshot / lossesSnapshot / drawsSnapshot / totalBoutsSnapshot / fighterSnapshot
 *    - 신청 시점 freeze. 이후 Fighter·MatchResult·Career 변경으로 UPDATE 금지.
 *    - 대진표·자동매칭·seeding·bracket print SSOT.
 *
 * C. MATCHON 공식 전적 (MatchResult confirmed/corrected live)
 *    - Career 공식 전적 SSOT. unified profile officialRecord.
 *    - Bracket/seeding에 주입하지 않음.
 *
 * Career total = A + C (표시용). B는 대회별 frozen copy.
 */
import type { MatchRecordOutcome, MatchRecordStatus } from "@/lib/enums";

export type UnifiedProfileViewerRole =
  | "gym"
  | "association"
  | "admin"
  | "fighter"
  | "public";

export type FighterUnifiedPublicProfile = {
  slug: string;
  isPublic: boolean;
  href: string | null;
};

export type FighterUnifiedIdentity = {
  fighterId: string;
  fighterCode: string;
  name: string;
  gender: string;
  birthDate: string | null;
  phone: string | null;
  status: string;
  primarySport: string | null;
  weightKg: number | null;
  currentGym: { id: string; name: string } | null;
  publicProfile: FighterUnifiedPublicProfile;
};

/** MatchResult live SSOT — bouts = W+L+D, totalMatches = bouts + noContests */
export type FighterOfficialRecord = {
  wins: number;
  losses: number;
  draws: number;
  noContests: number;
  bouts: number;
  totalMatches: number;
};

/** Gym 등록 기존/외부 전적 — Fighter.externalRecord* SSOT */
export type FighterExternalRecord = FighterOfficialRecord;

/** official + external 표시용 (DB 저장 없음) */
export type FighterCombinedRecord = FighterOfficialRecord;

export type FighterUnifiedRecentMatch = {
  matchResultId: string;
  matchId: string;
  eventId: string;
  eventTitle: string;
  eventDateIso: string;
  opponentName: string | null;
  opponentGymName: string | null;
  divisionLabel: string | null;
  weightClass: string | null;
  result: MatchRecordOutcome;
  resultLabel: string;
  resultTypeLabel: string | null;
  matchNumber: number | null;
  matNumber: number | null;
  status: MatchRecordStatus;
};

export type FighterUnifiedEventHistoryRow = {
  applicationId: string;
  eventId: string;
  eventTitle: string;
  eventDateIso: string | null;
  divisionLabel: string;
  applicationStatus: string;
  fighterNameSnapshot: string | null;
  gymNameSnapshot: string | null;
  hadOfficialMatch: boolean;
  resultSummary: string | null;
};

export type FighterUnifiedAffiliationRow = {
  id: string;
  gymId: string;
  gymName: string;
  startDateIso: string;
  endDateIso: string | null;
  status: string;
  isCurrent: boolean;
};

export type FighterUnifiedProfileView = {
  identity: FighterUnifiedIdentity;
  officialRecord: FighterOfficialRecord;
  externalRecord: FighterExternalRecord;
  combinedRecord: FighterCombinedRecord;
  recentMatches: FighterUnifiedRecentMatch[];
  eventHistory: FighterUnifiedEventHistoryRow[];
  affiliationHistory: FighterUnifiedAffiliationRow[];
};
