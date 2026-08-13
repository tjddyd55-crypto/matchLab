import { z } from "zod";
import { parseResidentRegistrationNumber } from "@/lib/athlete-application/resident-registration-number";

export const athleteRecordTextSchema = z
  .string()
  .trim()
  .max(200, "전적은 200자 이하여야 합니다.")
  .optional()
  .transform((s) => (s === "" ? undefined : s));

export const athleteCareerTextSchema = z
  .string()
  .trim()
  .max(200, "운동경력은 200자 이하여야 합니다.")
  .optional()
  .transform((s) => (s === "" ? undefined : s));

export const residentRegistrationNumberFieldSchema = z
  .string()
  .trim()
  .min(1, "주민등록번호를 입력해 주세요.")
  .transform((raw, ctx) => {
    const parsed = parseResidentRegistrationNumber(raw);
    if (!parsed.ok) {
      ctx.addIssue({ code: "custom", message: parsed.error });
      return z.NEVER;
    }
    return parsed.digits;
  });

export const insuranceConsentMustAgreeSchema = z
  .boolean()
  .refine((v) => v === true, {
    message: "보험가입 개인정보 수집·이용에 동의해 주세요.",
  });
