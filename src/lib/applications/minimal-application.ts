/**
 * 1차 최소 선수 신청 SSOT — UI/Excel/parser/server validation 공통 기준
 */

/** Excel·주최자 직접등록 1차 신청 필수 (대진 편성 최소) */
export const MINIMAL_APPLICATION_REQUIRED_FIELDS = [
  "선수명",
  "성별",
  "체육관명",
  "경기구분",
  "신청체중",
] as const;

/** 1차 신청에서 optional (값 있으면 검증·저장) */
export const MINIMAL_APPLICATION_OPTIONAL_FIELDS = [
  "생년월일",
  "연락처",
  "전적",
  "총전",
  "승",
  "무",
  "패",
  "운동경력",
  "메모",
  "주민등록번호",
  "보험가입 개인정보동의",
] as const;

export type ApplicationEntryChannel =
  | "excel_minimal"
  | "organizer_manual_minimal"
  | "gym_full_pii"
  | "external_full_pii";

/** insurancePiiRequired=false — RRN·동의 없이 저장 */
export function isMinimalApplicationChannel(
  channel: ApplicationEntryChannel,
): boolean {
  return (
    channel === "excel_minimal" || channel === "organizer_manual_minimal"
  );
}

export const MINIMAL_APPLICATION_GUIDE_LINES = [
  "1차 선수 신청은 대진 편성을 위한 기본정보만 등록합니다.",
  "주민등록번호 및 보험 동의 정보는 필요 시 별도로 요청할 수 있습니다.",
] as const;
