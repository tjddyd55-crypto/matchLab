import { z } from "zod";
import {
  AssociationJoinLinkStatus,
  AssociationMemberGymApplicationAttachmentType,
  AssociationMemberGymApplicationStatus,
} from "@/lib/enums";
import { MEMBER_GYM_RECEPTION_OPTIONS } from "@/lib/member-gym/application-form";

const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === "" ? undefined : v))
  .optional();

const receptionChannelValues = MEMBER_GYM_RECEPTION_OPTIONS.map((o) => o.value) as [
  (typeof MEMBER_GYM_RECEPTION_OPTIONS)[number]["value"],
  ...(typeof MEMBER_GYM_RECEPTION_OPTIONS)[number]["value"][],
];

export const createMemberGymJoinLinkSchema = z.object({
  label: z.string().trim().min(1, "링크명을 입력해 주세요.").max(120),
  expiresAt: optionalText,
  maxUses: z.coerce.number().int().positive().optional().nullable(),
  allowDuplicateApplication: z
    .union([z.boolean(), z.literal("on"), z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => v === true || v === "on" || v === "true"),
});

/** 공개·직접 등록 공통 신청 필드 */
export const memberGymApplicationBaseFieldsSchema = z.object({
  gymName: z.string().trim().min(1, "체육관명을 입력해 주세요.").max(120),
  ownerName: z.string().trim().min(1, "관장 성명을 입력해 주세요.").max(80),
  ownerNameEn: optionalText,
  birthDate: optionalText,
  gender: optionalText,
  phone: z.string().trim().min(1, "개인 연락처를 입력해 주세요.").max(40),
  gymPhone: optionalText,
  email: z.string().trim().email("올바른 이메일을 입력해 주세요."),
  homeAddress: optionalText,
  gymAddress: z.string().trim().min(1, "체육관 주소를 입력해 주세요.").max(240),
  gymAddressDetail: optionalText,
  businessNo: optionalText,
  sportType: optionalText,
  classDescription: optionalText,
  qualifications: optionalText,
  careerSummary: optionalText,
  memo: optionalText,
  contactName: optionalText,
  contactPhone: optionalText,
  contactEmail: optionalText,
  uploadBatchId: optionalText,
  attachmentsJson: optionalText,
});

export const memberGymJoinApplicationSchema =
  memberGymApplicationBaseFieldsSchema.extend({
    token: z.string().trim().min(1),
    privacyConsent: z.literal(true),
    registrationConsent: z.literal(true),
    smsConsent: z.boolean().optional(),
    informationConsent: z.boolean().optional(),
    signatureName: z
      .string()
      .trim()
      .min(1, "신청인 성명을 입력해 주세요.")
      .max(80),
    signatureConsent: z.literal(true),
  });

export const memberGymManualApplicationSchema =
  memberGymApplicationBaseFieldsSchema.extend({
    receptionChannel: z.enum(receptionChannelValues),
    receivedAt: optionalText,
    internalMemo: optionalText,
    paperConsentConfirmed: z.literal(true),
  });

export const applicationAttachmentMetaSchema = z.array(
  z.object({
    attachmentType: z.nativeEnum(AssociationMemberGymApplicationAttachmentType),
    storagePath: z.string().min(1),
    originalFileName: z.string().min(1).max(200),
    mimeType: z.string().min(1),
    sizeBytes: z.number().int().positive(),
  }),
);

export const transitionMemberGymApplicationSchema = z.object({
  applicationId: z.string().min(1),
  toStatus: z.enum([
    AssociationMemberGymApplicationStatus.under_review,
    AssociationMemberGymApplicationStatus.on_hold,
    AssociationMemberGymApplicationStatus.rejected,
    AssociationMemberGymApplicationStatus.supplementation_requested,
  ]),
  note: optionalText,
  rejectionReason: optionalText,
  supplementationNote: optionalText,
});

export const approveMemberGymApplicationSchema = z.object({
  applicationId: z.string().min(1),
  mode: z.enum(["link_existing", "create_new"]),
  gymId: optionalText,
  note: optionalText,
});

export const setJoinLinkStatusSchema = z.object({
  linkId: z.string().min(1),
  status: z.nativeEnum(AssociationJoinLinkStatus),
});
