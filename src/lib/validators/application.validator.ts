import { z } from "zod";
import {
  athleteCareerTextSchema,
  athleteRecordTextSchema,
  insuranceConsentMustAgreeSchema,
  residentRegistrationNumberFieldSchema,
} from "@/lib/athlete-application/profile-input";
import { parseSchoolGradeSelectValue } from "@/lib/fighter/school-grade-input";

const mustAgree = z.boolean().refine((v) => v === true, {
  message: "동의가 필요합니다.",
});

const optionalSchoolGradeSelectSchema = z
  .string()
  .trim()
  .optional()
  .default("")
  .superRefine((value, ctx) => {
    const parsed = parseSchoolGradeSelectValue(value);
    if (!parsed.ok) {
      ctx.addIssue({ code: "custom", message: parsed.error });
    }
  });

/**
 * 신청 시 휴대폰·생년월일 등은 클라이언트에서 새로 받지 않으며 Fighter 원본 기준 스냅샷만 서버가 생성한다.
 * 전적/운동경력/보험 주민번호는 대회 신청 단위로 받는다.
 */
export const applyToEventSchema = z.object({
  eventId: z.string().min(1),
  fighterId: z.string().min(1),
  applicationWeightKg: z.coerce.number().gt(0).lte(300),
  competitionCategory: z.string().trim().min(1, "경기구분을 선택해 주세요."),
  discipline: z.string().trim().optional(),
  schoolGradeSelect: optionalSchoolGradeSelectSchema,
  applicationProfileImageUrl: z
    .union([z.string().url(), z.literal("")])
    .optional(),
  memo: z.string().max(2000).optional(),
  recordText: athleteRecordTextSchema,
  careerText: athleteCareerTextSchema,
  residentRegistrationNumber: residentRegistrationNumberFieldSchema,
  insuranceConsentAgreed: insuranceConsentMustAgreeSchema,
  agreements: z.object({
    rulesAgreed: mustAgree,
    privacyAgreed: mustAgree,
    resultDisclosureAgreed: mustAgree,
    photoVideoAgreed: mustAgree,
    streamingAgreed: z.boolean().optional(),
  }),
});

export const approveApplicationSchema = z.object({
  applicationId: z.string().min(1),
});

export const rejectApplicationSchema = z.object({
  applicationId: z.string().min(1),
  reason: z.string().max(1000).optional(),
});

export const updatePaymentStatusSchema = z.object({
  paymentId: z.string().min(1),
  depositorName: z.string().max(120).optional(),
  memo: z.string().max(2000).optional(),
});

export type ApplyToEventInput = z.infer<typeof applyToEventSchema>;
