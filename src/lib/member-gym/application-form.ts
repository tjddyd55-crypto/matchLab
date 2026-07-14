import type { AssociationMemberGymApplicationAttachmentType } from "@/lib/enums";

/** 공개·직접 등록 공통 첨부 슬롯 SSOT */
export const MEMBER_GYM_APPLICATION_ATTACHMENT_SLOTS: AssociationMemberGymApplicationAttachmentType[] =
  [
    "representative_photo",
    "business_registration",
    "dan_certificate",
    "coach_certificate",
    "referee_certificate",
    "gym_exterior_photo",
    "gym_interior_photo",
    "other",
  ];

/** 관리자 직접 등록 전용 추가 첨부 */
export const MEMBER_GYM_MANUAL_EXTRA_ATTACHMENT_SLOTS: AssociationMemberGymApplicationAttachmentType[] =
  ["paper_application_scan"];

export const MEMBER_GYM_RECEPTION_OPTIONS = [
  { value: "paper", label: "종이 신청서" },
  { value: "visit", label: "방문" },
  { value: "phone", label: "전화" },
  { value: "email", label: "이메일" },
  { value: "manual", label: "기타(직접 입력)" },
] as const;

export type MemberGymReceptionChannel =
  (typeof MEMBER_GYM_RECEPTION_OPTIONS)[number]["value"];
