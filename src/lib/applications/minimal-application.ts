/**
 * 1차 최소 선수 신청 SSOT — UI/Excel/parser/server validation 공통 기준
 */

/** Excel·주최자 직접등록·등록링크 1차 신청 필수 */
export const MINIMAL_APPLICATION_REQUIRED_FIELDS = [
  "체육관명",
  "선수명",
  "성별",
  "생년월일",
  "연락처",
  "경기구분",
  "체급",
  "총전",
  "승",
  "무",
  "패",
] as const;

/** 조건부 필수 (미성년 → 보호자연락처, 체급=기타 → 기타내용) */
export const MINIMAL_APPLICATION_CONDITIONAL_FIELDS = [
  "보호자연락처",
  "기타내용",
] as const;

/** 1차 신청에서 optional (값 있으면 검증·저장) */
export const MINIMAL_APPLICATION_OPTIONAL_FIELDS = [
  "신청체중",
  "운동경력",
  "보호자이름",
  "메모",
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
  "주민등록번호·개인정보 동의·서명은 추후 별도 요청합니다. Excel만으로 추가정보를 완료 처리할 수 없습니다.",
] as const;
