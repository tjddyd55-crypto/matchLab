import type {
  AssociationScheduleType,
  AssociationScheduleVisibility,
  IntakeFormFieldType,
  IntakeFormStatus,
  IntakeFormSubmissionStatus,
} from "@/generated/prisma";

export const INTAKE_FORM_STATUS_LABEL: Record<IntakeFormStatus, string> = {
  DRAFT: "작성중",
  OPEN: "접수중",
  CLOSED: "마감",
};

export const INTAKE_FORM_SUBMISSION_STATUS_LABEL: Record<
  IntakeFormSubmissionStatus,
  string
> = {
  SUBMITTED: "신청",
  APPROVED: "승인",
  CANCELLED: "취소",
};

export const INTAKE_FORM_FIELD_TYPE_LABEL: Record<IntakeFormFieldType, string> = {
  text: "단답형",
  textarea: "장문형",
  number: "숫자",
  tel: "전화번호",
  email: "이메일",
  date: "날짜",
  radio: "단일 선택",
  select: "드롭다운",
  checkbox_group: "복수 선택",
  consent_checkbox: "동의 체크",
  static_info: "안내문",
};

export const ASSOCIATION_SCHEDULE_TYPE_LABEL: Record<
  AssociationScheduleType,
  string
> = {
  TOURNAMENT: "대회",
  EDUCATION: "교육",
  MEETING: "회의",
  EVENT: "행사",
  EXAM: "심사",
  OTHER: "기타",
};

export const ASSOCIATION_SCHEDULE_VISIBILITY_LABEL: Record<
  AssociationScheduleVisibility,
  string
> = {
  PRIVATE: "협회 내부",
  MEMBER_GYMS: "회원사 공개",
};
