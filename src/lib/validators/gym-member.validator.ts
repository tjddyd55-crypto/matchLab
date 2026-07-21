import { z } from "zod";
import {
  GymMemberPaymentMethod,
  GymMemberStatus,
  GymMembershipDurationType,
} from "@/lib/enums";
import {
  isDateOnlyNotAfterToday,
  isValidDateOnlyString,
  parseDateOnlyString,
} from "@/lib/date-only";
import {
  fighterPasswordSchema,
  loginIdSchema,
} from "@/lib/validators/fighter-account.validator";
import { birthDateOnlySchema } from "@/lib/validators/gym-fighter.validator";

function optionalTrimmedString(max = 500) {
  return z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((s) => (s === "" ? undefined : s));
}

function optionalPositiveInt() {
  return z.preprocess((val) => {
    if (val === "" || val === undefined || val === null) return undefined;
    const n = Number(val);
    return Number.isFinite(n) ? Math.trunc(n) : undefined;
  }, z.number().int().nonnegative().optional());
}

function optionalBoolFlag() {
  return z.preprocess((val) => {
    if (val === "" || val === undefined || val === null) return undefined;
    return val;
  }, z.enum(["true", "false"]).optional());
}

function optionalPositiveFloat() {
  return z.preprocess((val) => {
    if (val === "" || val === undefined || val === null) return undefined;
    const n = Number(val);
    return Number.isFinite(n) ? n : undefined;
  }, z.number().positive().optional());
}

function optionalPaymentMethod() {
  return z.preprocess((val) => {
    if (val === "" || val === undefined || val === null) return undefined;
    return val;
  }, z.nativeEnum(GymMemberPaymentMethod).optional());
}

const optionalBirthDate = z.preprocess((val) => {
  if (val === "" || val === undefined || val === null) return undefined;
  return val;
}, z
  .string()
  .refine(isValidDateOnlyString, {
    message: "생년월일은 YYYY-MM-DD 형식이어야 합니다.",
  })
  .refine(isDateOnlyNotAfterToday, {
    message: "생년월일은 미래일일 수 없습니다.",
  })
  .transform((s) => parseDateOnlyString(s)!)
  .optional());

const optionalDateOnly = z.preprocess((val) => {
  if (val === "" || val === undefined || val === null) return undefined;
  return val;
}, z
  .string()
  .refine(isValidDateOnlyString, {
    message: "날짜는 YYYY-MM-DD 형식이어야 합니다.",
  })
  .transform((s) => parseDateOnlyString(s)!)
  .optional());

export const gymMemberCreateSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력해 주세요."),
  phone: z.string().trim().min(1, "휴대전화번호를 입력해 주세요.").max(20),
  joinedAt: optionalDateOnly,
  birthDate: optionalBirthDate,
  gender: optionalTrimmedString(20),
  email: optionalTrimmedString(120),
  postalCode: optionalTrimmedString(10),
  address: optionalTrimmedString(200),
  addressDetail: optionalTrimmedString(200),
  emergencyContactName: optionalTrimmedString(80),
  emergencyContactPhone: optionalTrimmedString(20),
  guardianName: optionalTrimmedString(80),
  guardianPhone: optionalTrimmedString(20),
  primarySport: optionalTrimmedString(80),
  rankName: optionalTrimmedString(80),
  memo: optionalTrimmedString(2000),
  smsOptOut: optionalBoolFlag().transform((v) => v === "true"),
  confirmDuplicate: optionalBoolFlag().transform((v) => v === "true"),
  /** 이용권 배정 (선택) */
  planId: optionalTrimmedString(40),
  subscriptionStartedAt: optionalDateOnly,
  subscriptionEndsAt: optionalDateOnly,
  paymentAmount: optionalPositiveInt(),
  paymentMethod: optionalPaymentMethod(),
  paymentMemo: optionalTrimmedString(500),
  /** 선수로 함께 등록 */
  registerAsFighter: optionalBoolFlag().transform((v) => v === "true"),
  height: optionalPositiveFloat(),
  weight: optionalPositiveFloat(),
  fighterPrimarySport: optionalTrimmedString(80),
  createLoginAccount: optionalBoolFlag().transform((v) => v === "true"),
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
});

export type GymMemberCreateInput = z.infer<typeof gymMemberCreateSchema>;

export const gymMemberUpdateSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력해 주세요."),
  phone: z.string().trim().min(1, "휴대전화번호를 입력해 주세요.").max(20),
  birthDate: optionalBirthDate,
  gender: optionalTrimmedString(20),
  email: optionalTrimmedString(120),
  postalCode: optionalTrimmedString(10),
  address: optionalTrimmedString(200),
  addressDetail: optionalTrimmedString(200),
  emergencyContactName: optionalTrimmedString(80),
  emergencyContactPhone: optionalTrimmedString(20),
  guardianName: optionalTrimmedString(80),
  guardianPhone: optionalTrimmedString(20),
  primarySport: optionalTrimmedString(80),
  rankName: optionalTrimmedString(80),
  memo: optionalTrimmedString(2000),
  smsOptOut: optionalBoolFlag().transform((v) => v === "true"),
  joinedAt: optionalDateOnly,
});

export type GymMemberUpdateInput = z.infer<typeof gymMemberUpdateSchema>;

export const gymMemberStatusSchema = z.object({
  status: z.nativeEnum(GymMemberStatus),
  reason: optionalTrimmedString(500),
});

export const gymMembershipPlanSchema = z.object({
  name: z.string().trim().min(1, "이용권명을 입력해 주세요.").max(80),
  durationType: z.nativeEnum(GymMembershipDurationType),
  durationValue: optionalPositiveInt(),
  price: z.preprocess((val) => {
    if (val === "" || val === undefined || val === null) return 0;
    const n = Number(val);
    return Number.isFinite(n) ? Math.trunc(n) : 0;
  }, z.number().int().nonnegative()),
  description: optionalTrimmedString(500),
  sortOrder: optionalPositiveInt(),
  isActive: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v !== "false"),
});

export type GymMembershipPlanInput = z.infer<typeof gymMembershipPlanSchema>;

export const gymMemberSubscriptionAssignSchema = z.object({
  planId: z.string().trim().min(1),
  startedAt: optionalDateOnly,
  endsAt: optionalDateOnly,
  memo: optionalTrimmedString(500),
});

export const gymMemberSubscriptionExtendSchema = z.object({
  extendDays: z.preprocess((val) => {
    const n = Number(val);
    return Number.isFinite(n) ? Math.trunc(n) : undefined;
  }, z.number().int().positive()),
});

export const gymMemberPauseSchema = z.object({
  pausedAt: optionalDateOnly,
  resumeAt: optionalDateOnly,
  extendEndsAt: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v !== "false"),
  reason: optionalTrimmedString(500),
});

export const gymMemberPaymentCreateSchema = z.object({
  amount: z.preprocess((val) => {
    const n = Number(val);
    return Number.isFinite(n) ? Math.trunc(n) : undefined;
  }, z.number().int().positive("금액을 입력해 주세요.")),
  paidAt: optionalDateOnly,
  paymentMethod: z.nativeEnum(GymMemberPaymentMethod).default("cash"),
  subscriptionId: optionalTrimmedString(40),
  memo: optionalTrimmedString(500),
});

export const gymMemberPromoteFighterSchema = z.object({
  height: optionalPositiveFloat(),
  weight: optionalPositiveFloat(),
  primarySport: optionalTrimmedString(80),
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
});

export const gymMemberLinkFighterSchema = z.object({
  fighterId: z.string().trim().min(1),
});

export { birthDateOnlySchema, loginIdSchema, fighterPasswordSchema };
