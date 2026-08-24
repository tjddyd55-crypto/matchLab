import { z } from "zod";
import { registrationAccountSchema } from "@/lib/validators/fighter-account.validator";
import { structuredRecordFormSchema } from "@/lib/athlete-application/profile-input";

function optionalPositiveFloat() {
  return z.preprocess((val) => {
    if (val === "" || val === undefined || val === null) return undefined;
    const n = Number(val);
    return Number.isFinite(n) ? n : undefined;
  }, z.number().positive().optional());
}

/**
 * 공개 선수 등록 폼 — 주민등록번호 계열 필드는 스키마에 두지 않음.
 */
export const fighterRegistrationPublicSchema = z
  .object({
    name: z.string().trim().min(1, "이름을 입력해 주세요."),
    birthDate: z.coerce.date({ message: "생년월일을 선택해 주세요." }),
    gender: z.string().trim().min(1, "성별을 선택해 주세요."),
    phone: z.string().trim().min(9, "휴대폰 번호를 입력해 주세요.").max(20),
    height: optionalPositiveFloat(),
    weight: optionalPositiveFloat(),
    profileImageUrl: z
      .string()
      .trim()
      .max(2048)
      .optional()
      .transform((s) => (s === "" ? undefined : s))
      .refine(
        (s) => !s || /^https?:\/\/.+/i.test(s),
        "프로필 이미지는 http(s) URL만 입력할 수 있습니다.",
      ),
    schoolName: z.string().trim().optional().transform((s) => (s === "" ? undefined : s)),
    grade: z.string().trim().optional().transform((s) => (s === "" ? undefined : s)),
    guardianName: z.string().trim().optional().transform((s) => (s === "" ? undefined : s)),
    guardianPhone: z.string().trim().optional().transform((s) => (s === "" ? undefined : s)),
    structuredRecord: structuredRecordFormSchema,
  })
  .strict();

export type FighterRegistrationPublicInput = z.infer<
  typeof fighterRegistrationPublicSchema
>;

export const fighterRegistrationWithAccountSchema =
  fighterRegistrationPublicSchema
    .merge(registrationAccountSchema)
    .strict();

export type FighterRegistrationWithAccountInput = z.infer<
  typeof fighterRegistrationWithAccountSchema
>;
