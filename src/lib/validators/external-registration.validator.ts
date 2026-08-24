import { z } from "zod";
import { athleteCareerTextSchema } from "@/lib/athlete-application/profile-input";
import { DIVISION_SELECTION_OTHER_LABEL } from "@/lib/applications/division-selection";
import { parseSchoolGradeSelectValue } from "@/lib/fighter/school-grade-input";
import { validateRecord } from "@/lib/fighter/record";

export const EXTERNAL_REGISTRATION_MAX_ATHLETES = 50;

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

const genderSchema = z.enum(["male", "female"], {
  error: "성별을 선택해 주세요.",
});

const nonNegInt = z.number().int().min(0);
const nullableNonNegInt = z.number().int().min(0).nullable();

/** 1차 신청 — 전적: 총전만 또는 총전+승무패 전체 */
const requiredStructuredRecordSchema = z
  .object({
    totalBouts: nonNegInt,
    wins: nullableNonNegInt,
    draws: nullableNonNegInt,
    losses: nullableNonNegInt,
  })
  .superRefine((r, ctx) => {
    const result = validateRecord(r);
    if (!result.ok) {
      ctx.addIssue({ code: "custom", message: result.error });
    }
  });

const birthDateIsoSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "생년월일을 선택해 주세요.");

const optionalMemoSchema = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .transform((s) => (s === "" ? undefined : s));

const optionalPhoneSchema = z
  .string()
  .trim()
  .max(20)
  .optional()
  .transform((s) => (s === "" ? undefined : s));

/** 1차 신청 — 체육관명은 필수, 담당자 연락처는 선택(레거시 호환) */
export const externalRegistrationGymInfoSchema = z.object({
  gymName: z.string().trim().min(1, "체육관명을 입력해 주세요.").max(120),
  contactName: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((s) => (s === "" ? undefined : s)),
  contactPhone: optionalPhoneSchema,
  contactEmail: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((s) => (s === "" ? undefined : s)),
  memo: optionalMemoSchema,
});

const registeredDivisionSelectionSchema = z.object({
  selectionType: z.literal("REGISTERED"),
  divisionId: z.string().trim().min(1, "체급을 선택해 주세요."),
  requestedDivisionText: z.null().optional(),
});

const otherDivisionSelectionSchema = z.object({
  selectionType: z.literal("OTHER"),
  divisionId: z.null().optional(),
  requestedDivisionText: z
    .string()
    .trim()
    .min(1, "기타를 선택한 경우 체급 또는 요청사항을 입력해주세요.")
    .max(500),
});

export const externalRegistrationDivisionSelectionSchema = z.discriminatedUnion(
  "selectionType",
  [registeredDivisionSelectionSchema, otherDivisionSelectionSchema],
);

/** 1차 신청 선수 — RRN·보험동의 없음. 전적·연락처·체급선택 필수 */
export const externalRegistrationAthleteSchema = z.object({
  fighterName: z.string().trim().min(1, "선수 이름을 입력해 주세요."),
  gender: genderSchema,
  birthDate: birthDateIsoSchema,
  phone: z.string().trim().min(1, "연락처를 입력해 주세요.").max(20),
  guardianName: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((s) => (s === "" ? undefined : s)),
  guardianPhone: optionalPhoneSchema,
  competitionCategory: z.string().trim().min(1, "경기구분을 선택해 주세요."),
  /** compact label only (초1~고3). 자유문·공백 포함값 reject */
  schoolGradeSelect: optionalSchoolGradeSelectSchema,
  divisionSelection: externalRegistrationDivisionSelectionSchema,
  applicationWeightKg: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .optional()
    .transform((v) => {
      if (v == null || v === "") return undefined;
      return v;
    }),
  memo: optionalMemoSchema,
  structuredRecord: requiredStructuredRecordSchema,
  careerText: athleteCareerTextSchema,
});

export const externalRegistrationBatchSchema = z.object({
  token: z.string().trim().min(1),
  clientSubmissionId: z.string().uuid("제출 식별자가 올바르지 않습니다."),
  gymInfo: externalRegistrationGymInfoSchema,
  athletes: z
    .array(externalRegistrationAthleteSchema)
    .min(1, "선수를 1명 이상 입력해 주세요.")
    .max(
      EXTERNAL_REGISTRATION_MAX_ATHLETES,
      `한 번에 최대 ${EXTERNAL_REGISTRATION_MAX_ATHLETES}명까지 신청할 수 있습니다.`,
    ),
});

export type ExternalRegistrationGymInfoInput = z.infer<
  typeof externalRegistrationGymInfoSchema
>;
export type ExternalRegistrationAthleteInput = z.infer<
  typeof externalRegistrationAthleteSchema
>;
export type ExternalRegistrationBatchInput = z.infer<
  typeof externalRegistrationBatchSchema
>;
export type ExternalRegistrationDivisionSelectionInput = z.infer<
  typeof externalRegistrationDivisionSelectionSchema
>;

export { DIVISION_SELECTION_OTHER_LABEL };
