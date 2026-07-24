import { AssociationMemberGymApplicationAttachmentType } from "@/lib/enums";
import { GymApplicationAttachmentType } from "@/lib/enums";

/** 사진 전용 첨부 — PDF 불가 */
export const GYM_JOIN_IMAGE_ONLY_ATTACHMENT_TYPES = new Set<string>([
  "representative_photo",
  "gym_exterior_photo",
  "gym_interior_photo",
  "applicant_signature",
]);

export type GymJoinAttachmentSlot = {
  type: string;
  label: string;
  description: string;
  required: boolean;
  imageOnly: boolean;
};

/** 독립·초대 가입 공통 첨부 슬롯 (손서명 제외 — 서명 패드로 처리) */
export const GYM_JOIN_DOCUMENT_SLOTS: GymJoinAttachmentSlot[] = [
  {
    type: "representative_photo",
    label: "증명사진",
    description: "대표자 증명사진이 있다면 첨부해 주세요.",
    required: false,
    imageOnly: true,
  },
  {
    type: "business_registration",
    label: "사업자등록증",
    description:
      "사업자등록증 또는 고유번호증이 있다면 첨부해 주세요. 비사업자 체육시설도 가입할 수 있습니다.",
    required: false,
    imageOnly: false,
  },
  {
    type: "dan_certificate",
    label: "단증",
    description: "보유 단증을 확인할 수 있는 서류가 있다면 첨부해 주세요.",
    required: false,
    imageOnly: false,
  },
  {
    type: "coach_certificate",
    label: "지도자 자격",
    description: "지도자 자격 증빙이 있다면 첨부해 주세요.",
    required: false,
    imageOnly: false,
  },
  {
    type: "referee_certificate",
    label: "심판 자격",
    description: "심판 자격 증빙이 있다면 첨부해 주세요.",
    required: false,
    imageOnly: false,
  },
  {
    type: "gym_exterior_photo",
    label: "체육관 외부 사진",
    description: "체육관의 외부 전경을 확인할 수 있는 사진이 있다면 첨부해 주세요.",
    required: false,
    imageOnly: true,
  },
  {
    type: "gym_interior_photo",
    label: "체육관 내부 사진",
    description: "체육관 내부 시설을 확인할 수 있는 사진이 있다면 첨부해 주세요.",
    required: false,
    imageOnly: true,
  },
  {
    type: "other",
    label: "기타",
    description: "검토에 참고할 추가 서류가 있다면 첨부해 주세요.",
    required: false,
    imageOnly: false,
  },
];

export const GYM_JOIN_ATTACHMENT_HINT =
  "첨부한 파일은 가입 심사 목적으로만 안전하게 보관됩니다. 이미지는 JPEG, PNG, WebP 형식을 지원하며, 증빙 서류는 PDF 형식도 첨부할 수 있습니다.";

export function isGymApplicationAttachmentType(
  value: string,
): value is GymApplicationAttachmentType {
  return Object.values(GymApplicationAttachmentType).includes(
    value as GymApplicationAttachmentType,
  );
}

export function isMemberGymAttachmentType(
  value: string,
): value is AssociationMemberGymApplicationAttachmentType {
  return Object.values(AssociationMemberGymApplicationAttachmentType).includes(
    value as AssociationMemberGymApplicationAttachmentType,
  );
}
