import type {
  AssociationJoinLinkStatus,
  AssociationMemberGymApplicationAttachmentType,
  AssociationMemberGymApplicationStatus,
  AssociationMemberGymStatus,
} from "@/lib/enums";

export const MEMBER_GYM_APPLICATION_STATUS_LABEL: Record<
  AssociationMemberGymApplicationStatus,
  string
> = {
  submitted: "접수",
  under_review: "검토 중",
  supplementation_requested: "보완 요청",
  resubmitted: "재제출",
  on_hold: "보류",
  approved: "승인",
  rejected: "반려",
  withdrawn: "철회",
};

export const MEMBER_GYM_STATUS_LABEL: Record<AssociationMemberGymStatus, string> =
  {
    active: "정상",
    pending: "대기",
    on_hold: "보류",
    suspended: "정지",
    withdrawn: "탈퇴",
  };

export const ASSOCIATION_JOIN_LINK_STATUS_LABEL: Record<
  AssociationJoinLinkStatus,
  string
> = {
  active: "활성",
  inactive: "비활성",
  revoked: "폐기",
};

export const MEMBER_GYM_ATTACHMENT_TYPE_LABEL: Record<
  AssociationMemberGymApplicationAttachmentType,
  string
> = {
  business_registration: "사업자등록증",
  representative_photo: "증명사진",
  gym_exterior_photo: "체육관 외부 사진",
  gym_interior_photo: "체육관 내부 사진",
  instructor_certificate: "지도자 자격증",
  dan_certificate: "단증",
  association_certificate: "협회 자격증",
  coach_certificate: "지도자 자격",
  referee_certificate: "심판 자격",
  location_proof: "사업장 확인자료",
  identity_document: "신분 확인자료",
  other: "기타",
};

export const MEMBER_GYM_APPLICATION_FILTERS = [
  "all",
  "submitted",
  "under_review",
  "supplementation_requested",
  "resubmitted",
  "on_hold",
  "approved",
  "rejected",
] as const;

export type MemberGymApplicationFilter =
  (typeof MEMBER_GYM_APPLICATION_FILTERS)[number];
