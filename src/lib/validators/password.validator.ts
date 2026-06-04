import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(8, "비밀번호는 8자 이상이어야 합니다.")
  .max(72, "비밀번호가 너무 깁니다.")
  .refine((s) => !/\s/.test(s), {
    message: "비밀번호에 공백을 사용할 수 없습니다.",
  });

/** 선수·데모 등 — 숫자·특수문자 권장(미충족 시에도 8자 이상이면 통과) */
export const passwordSchemaWithHints = passwordSchema;
