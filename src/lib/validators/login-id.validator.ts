import { z } from "zod";

/** 4~20자, 영문 소문자·숫자·_·- 만 (첫 글자는 영문/숫자) */
export const LOGIN_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{3,19}$/;

export function normalizeLoginId(raw: string): string {
  return raw.trim().toLowerCase();
}

export function looksLikeEmail(value: string): boolean {
  const v = value.trim();
  if (!v.includes("@")) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export function isValidLoginId(loginId: string): boolean {
  const id = normalizeLoginId(loginId);
  if (id.length < 4 || id.length > 20) return false;
  if (looksLikeEmail(id)) return false;
  if (/[가-힣\s]/.test(id)) return false;
  return LOGIN_ID_PATTERN.test(id);
}

export const loginIdSchema = z
  .string()
  .trim()
  .min(4, "아이디는 4자 이상이어야 합니다.")
  .max(20, "아이디는 20자 이하여야 합니다.")
  .transform(normalizeLoginId)
  .refine((id) => !looksLikeEmail(id), {
    message: "이메일 형식은 아이디로 사용할 수 없습니다.",
  })
  .refine(isValidLoginId, {
    message:
      "아이디는 영문 소문자, 숫자, _, - 만 사용할 수 있습니다 (4~20자).",
  });
