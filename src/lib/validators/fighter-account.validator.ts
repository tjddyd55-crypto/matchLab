import { z } from "zod";
import { loginIdSchema } from "@/lib/validators/login-id.validator";
import { passwordSchema } from "@/lib/validators/password.validator";

export { loginIdSchema } from "@/lib/validators/login-id.validator";
export { passwordSchema as fighterPasswordSchema } from "@/lib/validators/password.validator";

export const fighterAccountProvisionSchema = z.object({
  loginId: loginIdSchema,
  password: passwordSchema,
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
    password: passwordSchema,
    passwordConfirm: z.string().min(1, "비밀번호 확인을 입력해 주세요."),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    message: "비밀번호가 일치하지 않습니다.",
    path: ["passwordConfirm"],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "현재 비밀번호를 입력해 주세요."),
    newPassword: passwordSchema,
    newPasswordConfirm: z.string().min(1),
  })
  .refine((d) => d.newPassword === d.newPasswordConfirm, {
    message: "새 비밀번호가 일치하지 않습니다.",
    path: ["newPasswordConfirm"],
  });

export const signInIdentifierSchema = z.object({
  identifier: z.string().trim().min(1, "아이디를 입력해 주세요."),
  password: z.string().min(1, "비밀번호를 입력해 주세요."),
});
