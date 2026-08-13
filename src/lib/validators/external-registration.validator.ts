import { z } from "zod";
import {
  athleteCareerTextSchema,
  athleteRecordTextSchema,
  insuranceConsentMustAgreeSchema,
  residentRegistrationNumberFieldSchema,
} from "@/lib/athlete-application/profile-input";

export const EXTERNAL_REGISTRATION_MAX_ATHLETES = 50;

const genderSchema = z.string().trim().min(1, "성별을 선택해 주세요.");

export const externalRegistrationGymInfoSchema = z.object({
  gymName: z.string().trim().min(1, "체육관명을 입력해 주세요.").max(120),
  contactName: z.string().trim().min(1, "담당자명을 입력해 주세요.").max(80),
  contactPhone: z.string().trim().min(1, "연락처를 입력해 주세요.").max(20),
  contactEmail: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((s) => (s === "" ? undefined : s)),
  memo: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((s) => (s === "" ? undefined : s)),
});

export const externalRegistrationAthleteSchema = z.object({
  fighterName: z.string().trim().min(1, "선수 이름을 입력해 주세요."),
  gender: genderSchema,
  birthDate: z.coerce.date({ message: "생년월일을 선택해 주세요." }),
  phone: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((s) => (s === "" ? undefined : s)),
  guardianName: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((s) => (s === "" ? undefined : s)),
  guardianPhone: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((s) => (s === "" ? undefined : s)),
  divisionId: z.string().min(1, "체급을 선택해 주세요."),
  memo: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((s) => (s === "" ? undefined : s)),
  recordText: athleteRecordTextSchema,
  careerText: athleteCareerTextSchema,
  residentRegistrationNumber: residentRegistrationNumberFieldSchema,
  insuranceConsentAgreed: insuranceConsentMustAgreeSchema,
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
