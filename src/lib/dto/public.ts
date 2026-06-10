import type {
  BracketMatchOutcomeStyle,
  BracketMatchStatus,
  BracketStatus,
  BracketType,
  EventStatus,
  LivePlatform,
  LiveStreamStatus,
  MatchRecordOutcome,
} from "@/lib/enums";
import type { OrganizerRegistrationStatus } from "@/lib/event-organizer-status";

/**
 * 공개 API·페이지 전용 DTO.
 * 휴대폰·생년월일·보호자·서명 경로·IP·userAgent·내부 메모 등은 포함하지 않는다.
 */

export type PublicEventPaymentInfoDTO = {
  feeAmount: number;
  feeLabel: string;
  bankName: string | null;
  accountHolder: string | null;
  depositorRule: string | null;
  /** 계좌번호는 공개 정책상 미포함 — 체육관 신청 화면에서만 확인 */
  noticeLines: string[];
};

export type PublicEventListItemDTO = {
  id: string;
  publicSlug: string;
  title: string;
  location: string | null;
  eventDate: string;
  registrationStartDate: string;
  registrationEndDate: string;
  status: EventStatus;
  posterUrl: string | null;
  /** 포스터 없을 때 갤러리 첫 장(공개 URL만) */
  coverImageUrl: string | null;
  registrationStatus: OrganizerRegistrationStatus;
  primarySport: string | null;
  liveStreamingEnabled: boolean;
  /** 부문 요약 문구 (예: 라벨 나열 · 외 N개) */
  divisionSummary: string;
  organizerName: string;
  hasPublicBrackets: boolean;
  hasPublicResults: boolean;
};

export type PublicEventDivisionDTO = {
  id: string;
  sportType: string;
  ruleType: string | null;
  gender: string | null;
  ageGroup: string | null;
  weightClass: string | null;
  skillLevel: string | null;
};

export type PublicEventGalleryImageDTO = {
  id: string;
  imageUrl: string;
  caption: string | null;
  sortOrder: number;
};

export type PublicEventDetailDTO = {
  id: string;
  publicSlug: string;
  title: string;
  description: string | null;
  location: string | null;
  eventDate: string;
  registrationStartDate: string;
  registrationEndDate: string;
  status: EventStatus;
  posterUrl: string | null;
  coverImageUrl: string | null;
  registrationStatus: OrganizerRegistrationStatus;
  primarySport: string | null;
  galleryImages: PublicEventGalleryImageDTO[];
  photoRecordingEnabled: boolean;
  videoRecordingEnabled: boolean;
  liveStreamingEnabled: boolean;
  streamingNoticeText: string | null;
  streamingConsentRequired: boolean;
  organizerName: string;
  divisions: PublicEventDivisionDTO[];
  /** 참가비·계좌 등은 공개 페이지에 노출하지 않음 — 안내 문구만 사용 */
  participantFeeNotice: string;
  paymentInfo: PublicEventPaymentInfoDTO | null;
  hasPublicBrackets: boolean;
  hasPublicResults: boolean;
  /** 미매칭(대기) 명단 공개 여부 — 주최자 토글 */
  publicUnmatchedListEnabled: boolean;
};

export type PublicFighterCardDTO = {
  fighterId: string;
  fighterCode: string;
  displayName: string;
  gymName: string | null;
  weightClassLabel: string | null;
  sportTypeLabel: string | null;
  /** 공개 가능한 프로필 이미지 URL(스냅샷·CDN 정책에 따름) */
  profileImageUrl: string | null;
  /** UI용 캐시 — 공식 전적은 MatchResult 집계 */
  recordWin: number;
  recordLoss: number;
  recordDraw: number;
};

/** 공개 대진표 선수 카드 — 휴대폰·생년월일 등 미포함. 스냅샷 JSON과 동형 필드를 유지한다. */
export type PublicBracketFighterDTO = {
  fighterId: string;
  fighterCode: string;
  name: string;
  gymName: string | null;
  profileImageUrl: string | null;
  recordSummary: string;
  divisionName: string | null;
};

export type PublicBracketMatchDTO = {
  id: string;
  round: number | null;
  roundName: string | null;
  matchOrder: number;
  globalMatchOrder: number | null;
  matchNumber: number | null;
  matNumber: number | null;
  fighterRed: PublicBracketFighterDTO | null;
  fighterBlue: PublicBracketFighterDTO | null;
  status: BracketMatchStatus;
  winnerId: string | null;
  loserId: string | null;
  resultType: BracketMatchOutcomeStyle | null;
};

export type PublicBracketDetailDTO = {
  id: string;
  title: string;
  type: BracketType;
  status: BracketStatus;
  divisionLabel: string | null;
  matches: PublicBracketMatchDTO[];
};

/** 공개 미매칭(대기) 명단 — 민감정보 제외 */
export type PublicUnmatchedCandidateDTO = {
  order: number;
  fighterName: string;
  gymName: string;
  gender: string | null;
  ageGroup: string | null;
  weightClass: string | null;
  divisionLabel: string;
  recordSummary: string;
  reasonLabel: string;
};

export type PublicResultDTO = {
  matchId: string;
  bracketId: string;
  eventTitle: string;
  divisionLabel: string | null;
  /** 선수별 공개 카드 — 공식 결과는 MatchResult 원천 */
  fighter: PublicFighterCardDTO;
  opponent: PublicFighterCardDTO;
  outcome: MatchRecordOutcome;
  /** 경기 결방식 표시용 라벨(문자열로 정규화 — enum과 별개) */
  outcomeStyleLabel: string | null;
  matchDate: string;
};

/** 공개 결과 페이지용 — 스냅샷 기반, 민감 필드 없음 */
export type PublicRecordFighterDTO = {
  fighterId: string;
  fighterCode: string;
  name: string;
  gymName: string | null;
  profileImageUrl: string | null;
};

export type PublicMatchResultDTO = {
  matchId: string;
  bracketTitle: string;
  bracketType: BracketType;
  divisionLabel: string | null;
  matchNumber: number | null;
  matNumber: number | null;
  matchDate: string;
  fighter: PublicRecordFighterDTO | null;
  opponent: PublicRecordFighterDTO | null;
  result: MatchRecordOutcome;
  resultType: BracketMatchOutcomeStyle | null;
  resultTypeLabel: string | null;
};

export type PublicEventResultDTO = {
  eventTitle: string;
  results: PublicMatchResultDTO[];
};

export type PublicLiveStreamDTO = {
  id: string;
  title: string;
  platform: LivePlatform;
  streamType: "main" | "mat";
  matNumber: number | null;
  watchUrl: string;
  embedUrl: string | null;
  status: LiveStreamStatus;
  isPublic: boolean;
};

/** 내부 조회 결과에서 공개 카드만 추출할 때 사용하는 헬퍼(후속 구현). */
export function toPublicFighterCardDTO(
  card: PublicFighterCardDTO,
): PublicFighterCardDTO {
  return { ...card };
}
