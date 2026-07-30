import { z } from "zod";
import { GymStaffAssignmentType, GymStaffRole } from "@/lib/enums";

function optionalTrimmedString(max: number) {
  return z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((s) => (s === "" ? undefined : s));
}

function optionalBoolFlag() {
  return z.preprocess((val) => {
    if (val === "" || val === undefined || val === null) return undefined;
    return val;
  }, z.enum(["true", "false"]).optional());
}

const staffRoleSchema = z.preprocess(
  (val) => (val === "" || val === undefined || val === null ? undefined : val),
  z.nativeEnum(GymStaffRole).optional(),
);

const assignmentTypeSchema = z.preprocess(
  (val) => (val === "" || val === undefined || val === null ? undefined : val),
  z.nativeEnum(GymStaffAssignmentType).optional(),
);

export const gymStaffCreateSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력해 주세요.").max(80),
  phone: z.string().trim().min(1, "휴대전화번호를 입력해 주세요.").max(20),
  email: optionalTrimmedString(120),
  staffRole: staffRoleSchema,
  title: optionalTrimmedString(80),
  colorKey: optionalTrimmedString(20),
});

export type GymStaffCreateInput = z.infer<typeof gymStaffCreateSchema>;

export const gymStaffUpdateSchema = gymStaffCreateSchema.extend({
  isActive: optionalBoolFlag().transform((v) => v !== "false"),
});

export type GymStaffUpdateInput = z.infer<typeof gymStaffUpdateSchema>;

export const gymStaffAssignmentCreateSchema = z.object({
  gymMemberId: z.string().trim().min(1, "회원을 선택해 주세요."),
  assignmentType: assignmentTypeSchema,
  isPrimary: optionalBoolFlag().transform((v) => v === "true"),
  memo: optionalTrimmedString(500),
});

export type GymStaffAssignmentCreateInput = z.infer<
  typeof gymStaffAssignmentCreateSchema
>;

export const gymStaffAccountSetupCompleteSchema = z.object({
  token: z.string().trim().min(1),
  loginId: z.string().trim().min(1, "아이디를 입력해 주세요."),
  password: z.string().min(1, "비밀번호를 입력해 주세요."),
  passwordConfirm: z.string().min(1, "비밀번호 확인을 입력해 주세요."),
});

export const gymStaffPasswordResetCompleteSchema = z.object({
  token: z.string().trim().min(1),
  password: z.string().min(1, "비밀번호를 입력해 주세요."),
  passwordConfirm: z.string().min(1, "비밀번호 확인을 입력해 주세요."),
});
