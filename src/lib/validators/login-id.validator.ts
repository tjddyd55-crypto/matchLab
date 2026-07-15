import { z } from "zod";

/** 4~20자, 영문 소문자·숫자·_·- 만 (첫 글자는 영문/숫자) */
export const LOGIN_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{3,19}$/;

/** 회원가입·계정 활성화 공통 예약어 (정규화 후 비교) */
export const RESERVED_LOGIN_IDS = new Set([
  "admin",
  "administrator",
  "system",
  "root",
  "matchon",
  "support",
  "organizer",
  "gym",
  "login",
  "register",
  "null",
  "undefined",
]);

export function normalizeLoginId(raw: string): string {
  return raw.trim().toLowerCase();
}

export function looksLikeEmail(value: string): boolean {
  const v = value.trim();
  if (!v.includes("@")) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export function isReservedLoginId(loginId: string): boolean {
  return RESERVED_LOGIN_IDS.has(normalizeLoginId(loginId));
}

export function isValidLoginId(loginId: string): boolean {
  const id = normalizeLoginId(loginId);
  if (id.length < 4 || id.length > 20) return false;
  if (looksLikeEmail(id)) return false;
  if (/[가-힣\s]/.test(id)) return false;
  if (isReservedLoginId(id)) return false;
  return LOGIN_ID_PATTERN.test(id);
}

export const loginIdSchema = z
  .string()
  .trim()
  .min(4, "영문 소문자, 숫자, _, -를 사용해 4~20자로 입력해 주세요.")
  .max(20, "영문 소문자, 숫자, _, -를 사용해 4~20자로 입력해 주세요.")
  .transform(normalizeLoginId)
  .refine((id) => !looksLikeEmail(id), {
    message: "이메일 형식은 아이디로 사용할 수 없습니다.",
  })
  .refine((id) => !isReservedLoginId(id), {
    message: "사용할 수 없는 아이디입니다.",
  })
  .refine(isValidLoginId, {
    message: "영문 소문자, 숫자, _, -를 사용해 4~20자로 입력해 주세요.",
  });
