import { z } from "zod";
import { FighterStatus } from "@/lib/enums";

function optionalPositiveFloat() {
  return z.preprocess((val) => {
    if (val === "" || val === undefined || val === null) return undefined;
    const n = Number(val);
    return Number.isFinite(n) ? n : undefined;
  }, z.number().positive().optional());
}

function optionalTrimmedString(max = 500) {
  return z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((s) => (s === "" ? undefined : s));
}

const genderSchema = z.string().trim().min(1, "성별을 선택해 주세요.");

export const gymFighterCreateSchema = z
  .object({
    name: z.string().trim().min(1, "선수명을 입력해 주세요."),
    birthDate: z.coerce.date({ message: "생년월일을 선택해 주세요." }),
    gender: genderSchema,
    phone: z
      .string()
      .trim()
      .max(20)
      .optional()
      .transform((s) => (s === "" ? undefined : s)),
    height: optionalPositiveFloat(),
    weight: optionalPositiveFloat(),
    primarySport: optionalTrimmedString(80),
    guardianName: optionalTrimmedString(80),
    guardianPhone: optionalTrimmedString(20),
    gymInternalMemo: optionalTrimmedString(2000),
    confirmDuplicateLink: z
      .enum(["true", "false"])
      .optional()
      .transform((v) => v === "true"),
    linkFighterId: z.string().trim().optional(),
  })
  .strict();

export const gymFighterUpdateSchema = z
  .object({
    fighterId: z.string().min(1),
    name: z.string().trim().min(1, "선수명을 입력해 주세요."),
    birthDate: z.coerce.date({ message: "생년월일을 선택해 주세요." }),
    gender: genderSchema,
    phone: z
      .string()
      .trim()
      .max(20)
      .optional()
      .transform((s) => (s === "" ? undefined : s)),
    height: optionalPositiveFloat(),
    weight: optionalPositiveFloat(),
    primarySport: optionalTrimmedString(80),
    guardianName: optionalTrimmedString(80),
    guardianPhone: optionalTrimmedString(20),
    gymInternalMemo: optionalTrimmedString(2000),
    status: z.nativeEnum(FighterStatus).optional(),
    releaseAffiliation: z
      .enum(["true", "false"])
      .optional()
      .transform((v) => v === "true"),
  })
  .strict();

export type GymFighterCreateInput = z.infer<typeof gymFighterCreateSchema>;
export type GymFighterUpdateInput = z.infer<typeof gymFighterUpdateSchema>;
