import { z } from "zod";
import { parseResidentRegistrationNumber } from "@/lib/athlete-application/resident-registration-number";
import {
  RECORD_PARTIAL_DETAIL_MESSAGE,
  RECORD_SUM_MISMATCH_MESSAGE,
  validateRecord,
} from "@/lib/fighter/record";

export const athleteRecordTextSchema = z
  .string()
  .trim()
  .max(200, "전적은 200자 이하여야 합니다.")
  .optional()
  .transform((s) => (s === "" ? undefined : s));

/** Form/JSON — 빈 문자열·undefined → null(모름), 숫자 0은 유지 */
export function coerceNullableNonNegInt(val: unknown): number | null {
  if (val === "" || val === undefined || val === null) return null;
  const n = typeof val === "number" ? val : Number(val);
  if (!Number.isFinite(n)) return null;
  return n;
}

const nonNegInt = z.number().int().min(0);
const nullableNonNegInt = z.number().int().min(0).nullable();

function refineStructuredRecord(
  r: {
    totalBouts: number;
    wins: number | null;
    draws: number | null;
    losses: number | null;
  },
  ctx: z.RefinementCtx,
) {
  const result = validateRecord(r);
  if (!result.ok) {
    ctx.addIssue({
      code: "custom",
      message: result.error,
      path:
        result.error === RECORD_PARTIAL_DETAIL_MESSAGE
          ? ["wins"]
          : result.error === RECORD_SUM_MISMATCH_MESSAGE
            ? ["totalBouts"]
            : ["totalBouts"],
    });
  }
}

/** 구조화 전적 — 총전만 또는 총전+승무패 전체 */
export const structuredRecordSchema = z
  .object({
    totalBouts: nonNegInt,
    wins: nullableNonNegInt,
    draws: nullableNonNegInt,
    losses: nullableNonNegInt,
  })
  .superRefine(refineStructuredRecord)
  .optional();

/** FormData coerce용 구조화 전적 */
export const structuredRecordFormSchema = z
  .object({
    totalBouts: z.preprocess((val) => {
      if (val === "" || val === undefined || val === null) return 0;
      const n = Number(val);
      return Number.isFinite(n) ? n : val;
    }, nonNegInt),
    wins: z.preprocess(coerceNullableNonNegInt, nullableNonNegInt),
    draws: z.preprocess(coerceNullableNonNegInt, nullableNonNegInt),
    losses: z.preprocess(coerceNullableNonNegInt, nullableNonNegInt),
  })
  .superRefine(refineStructuredRecord)
  .optional();

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

/** 1차 신청·주최자 직접등록: 미입력 허용 */
export const optionalResidentRegistrationNumberFieldSchema = z
  .string()
  .trim()
  .optional()
  .transform((raw, ctx) => {
    if (!raw) return undefined;
    const parsed = parseResidentRegistrationNumber(raw);
    if (!parsed.ok) {
      ctx.addIssue({ code: "custom", message: parsed.error });
      return z.NEVER;
    }
    return parsed.digits;
  });

export const optionalInsuranceConsentSchema = z.boolean().optional().default(false);
