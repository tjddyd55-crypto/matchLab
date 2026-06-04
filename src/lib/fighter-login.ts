import { looksLikeEmail, normalizeLoginId } from "@/lib/validators/login-id.validator";

const INTERNAL_EMAIL_DOMAIN =
  process.env.FIGHTER_INTERNAL_EMAIL_DOMAIN?.trim() ||
  "internal.matchlab.local";

export {
  isValidLoginId,
  looksLikeEmail,
  normalizeLoginId,
  LOGIN_ID_PATTERN,
  loginIdSchema,
} from "@/lib/validators/login-id.validator";

export { passwordSchema as fighterPasswordSchema } from "@/lib/validators/password.validator";

export function loginIdToAuthEmail(loginId: string): string {
  const id = normalizeLoginId(loginId);
  return `${id}@${INTERNAL_EMAIL_DOMAIN}`;
}

/** 하위 호환: 데모·레거시 이메일 로그인 */
export function isEmailLoginIdentifier(raw: string): boolean {
  return looksLikeEmail(raw);
}

export function generateTemporaryPassword(length = 12): string {
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const upper = "ABCDEFGHJKMNPQRSTUVWXYZ";
  const digits = "23456789";
  const special = "!@#$%&*";
  const all = lower + upper + digits + special;
  const minLen = Math.max(8, length);
  const pick = (pool: string) => pool[Math.floor(Math.random() * pool.length)]!;
  let out = pick(lower) + pick(upper) + pick(digits) + pick(special);
  for (let i = out.length; i < minLen; i++) {
    out += pick(all);
  }
  return out
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

export function suggestLoginIdFromFighter(input: {
  fighterCode: string;
  name: string;
}): string {
  const fromCode = input.fighterCode
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(-12);
  if (fromCode.length >= 4 && fromCode.length <= 20) return fromCode;
  const fromName = input.name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 8);
  const base = `${fromName || "fighter"}${Date.now().toString().slice(-4)}`
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 20);
  return base.length >= 4 ? base : `ftr${Date.now().toString().slice(-6)}`;
}
