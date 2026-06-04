import { z } from "zod";
import { isValidLoginId, normalizeLoginId } from "@/lib/fighter-login";

export const loginIdSchema = z
  .string()
  .trim()
  .min(4, "아이디는 4자 이상이어야 합니다.")
  .max(32, "아이디는 32자 이하여야 합니다.")
  .transform(normalizeLoginId)
  .refine(isValidLoginId, {
    message:
      "아이디는 영문 소문자, 숫자, _, - 만 사용할 수 있습니다.",
  });

export const fighterPasswordSchema = z
  .string()
  .min(6, "비밀번호는 6자 이상이어야 합니다.")
  .max(72, "비밀번호가 너무 깁니다.");

export const fighterAccountProvisionSchema = z.object({
  loginId: loginIdSchema,
  password: fighterPasswordSchema,
  mustChangePassword: z.boolean().optional().default(true),
});

export const fighterAccountProvisionAutoSchema = z.object({
  loginId: loginIdSchema.optional(),
  generatePassword: z.literal(true),
  mustChangePassword: z.boolean().optional().default(true),
});

export const registrationAccountSchema = z
  .object({
    loginId: loginIdSchema,
    password: fighterPasswordSchema,
    passwordConfirm: z.string().min(1, "비밀번호 확인을 입력해 주세요."),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    message: "비밀번호가 일치하지 않습니다.",
    path: ["passwordConfirm"],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "현재 비밀번호를 입력해 주세요."),
    newPassword: fighterPasswordSchema,
    newPasswordConfirm: z.string().min(1),
  })
  .refine((d) => d.newPassword === d.newPasswordConfirm, {
    message: "새 비밀번호가 일치하지 않습니다.",
    path: ["newPasswordConfirm"],
  });

export const signInIdentifierSchema = z.object({
  identifier: z.string().trim().min(1, "이메일 또는 아이디를 입력해 주세요."),
  password: z.string().min(1, "비밀번호를 입력해 주세요."),
});
