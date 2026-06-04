import { z } from "zod";
import { FighterStatus } from "@/lib/enums";
import {
  fighterPasswordSchema,
  loginIdSchema,
} from "@/lib/validators/fighter-account.validator";

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
    createLoginAccount: z
      .enum(["true", "false"])
      .optional()
      .transform((v) => v === "true"),
    loginId: z
      .string()
      .trim()
      .optional()
      .transform((s) => (s === "" ? undefined : s)),
    password: z
      .string()
      .trim()
      .optional()
      .transform((s) => (s === "" ? undefined : s)),
    autoGeneratePassword: z
      .enum(["true", "false"])
      .optional()
      .transform((v) => v === "true"),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (!data.createLoginAccount) return;
    if (!data.loginId) {
      ctx.addIssue({
        code: "custom",
        message: "로그인 아이디를 입력해 주세요.",
        path: ["loginId"],
      });
    } else {
      const r = loginIdSchema.safeParse(data.loginId);
      if (!r.success) {
        ctx.addIssue({
          code: "custom",
          message: r.error.issues[0]?.message ?? "아이디 형식이 올바르지 않습니다.",
          path: ["loginId"],
        });
      }
    }
    if (!data.password && !data.autoGeneratePassword) {
      ctx.addIssue({
        code: "custom",
        message: "초기 비밀번호를 입력하거나 자동 생성을 선택해 주세요.",
        path: ["password"],
      });
    }
    if (data.password) {
      const r = fighterPasswordSchema.safeParse(data.password);
      if (!r.success) {
        ctx.addIssue({
          code: "custom",
          message: r.error.issues[0]?.message ?? "비밀번호 형식이 올바르지 않습니다.",
          path: ["password"],
        });
      }
    }
  });

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
