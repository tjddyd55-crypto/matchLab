import { z } from "zod";
import {
  isDateOnlyNotAfterToday,
  isValidDateOnlyString,
  parseDateOnlyString,
} from "@/lib/date-only";
import {
  GYM_MEMBER_SELF_REG_GENDERS,
  GYM_MEMBER_SELF_REG_TIME_BANDS,
} from "@/lib/gym-member-self-registration/constants";
import { isMinorBirthDate } from "@/lib/gym-member-self-registration/age";
import type { HealthSnapshot } from "@/lib/gym-member-self-registration/types";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((s) => (s ? s : undefined));

const healthAnswerSchema = z.object({
  answer: z.boolean().nullable(),
  detail: z.string().trim().max(1000),
});

export const healthSnapshotSchema = z.object({
  currentCondition: healthAnswerSchema,
  medicationOrDisease: healthAnswerSchema,
  exerciseCaution: healthAnswerSchema,
  recentSurgeryOrHospital: healthAnswerSchema,
});

export const selfRegistrationSubmitSchema = z
  .object({
    token: z.string().trim().min(16).max(128),
    clientSubmissionId: z.string().trim().min(8).max(80),
    name: z.string().trim().min(1, "이름을 입력해 주세요.").max(80),
    gender: z.enum(GYM_MEMBER_SELF_REG_GENDERS, {
      message: "성별을 선택해 주세요.",
    }),
    birthDate: z
      .string()
      .refine(isValidDateOnlyString, "생년월일은 YYYY-MM-DD 형식이어야 합니다.")
      .refine(isDateOnlyNotAfterToday, "생년월일은 미래일일 수 없습니다."),
    phone: z.string().trim().min(9, "연락처를 입력해 주세요.").max(20),
    postalCode: optionalText(10),
    address: optionalText(200),
    addressDetail: optionalText(200),
    occupationOrSchool: optionalText(120),
    guardianName: optionalText(80),
    guardianPhone: optionalText(20),
    preferredTimeBand: z.enum(GYM_MEMBER_SELF_REG_TIME_BANDS).optional(),
    purposeText: optionalText(500),
    experienceText: optionalText(2000),
    health: healthSnapshotSchema,
    privacyAgreed: z.literal(true, {
      message: "개인정보 수집·이용에 동의해 주세요.",
    }),
    termsAgreed: z.literal(true, {
      message: "이용 안내에 동의해 주세요.",
    }),
    guardianConsentAgreed: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    const birth = parseDateOnlyString(data.birthDate);
    if (!birth) return;
    if (isMinorBirthDate(birth)) {
      if (!data.guardianName) {
        ctx.addIssue({
          code: "custom",
          path: ["guardianName"],
          message: "미성년자는 보호자 이름이 필요합니다.",
        });
      }
      if (!data.guardianPhone) {
        ctx.addIssue({
          code: "custom",
          path: ["guardianPhone"],
          message: "미성년자는 보호자 연락처가 필요합니다.",
        });
      }
      if (data.guardianConsentAgreed !== true) {
        ctx.addIssue({
          code: "custom",
          path: ["guardianConsentAgreed"],
          message: "미성년자는 보호자 동의가 필요합니다.",
        });
      }
    }
    assertHealthDetails(data.health, ctx);
  });

function assertHealthDetails(
  health: HealthSnapshot,
  ctx: z.RefinementCtx,
) {
  const entries: Array<[keyof HealthSnapshot, string]> = [
    ["currentCondition", "건강상 이상"],
    ["medicationOrDisease", "복용약/질환"],
    ["exerciseCaution", "운동 시 주의사항"],
    ["recentSurgeryOrHospital", "수술/입원"],
  ];
  for (const [key, label] of entries) {
    const row = health[key];
    if (row.answer == null) {
      ctx.addIssue({
        code: "custom",
        path: ["health", key, "answer"],
        message: `${label}에 답해 주세요.`,
      });
      continue;
    }
    if (row.answer === true && !row.detail.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["health", key, "detail"],
        message: `${label} 상세 내용을 입력해 주세요.`,
      });
    }
  }
}

export type SelfRegistrationSubmitInput = z.infer<
  typeof selfRegistrationSubmitSchema
>;
