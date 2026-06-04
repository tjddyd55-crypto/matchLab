const INTERNAL_EMAIL_DOMAIN =
  process.env.FIGHTER_INTERNAL_EMAIL_DOMAIN?.trim() ||
  "internal.matchlab.local";

const LOGIN_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{2,31}$/;

export function normalizeLoginId(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidLoginId(loginId: string): boolean {
  return LOGIN_ID_PATTERN.test(loginId);
}

export function loginIdToAuthEmail(loginId: string): string {
  const id = normalizeLoginId(loginId);
  return `${id}@${INTERNAL_EMAIL_DOMAIN}`;
}

/** 이메일 형식이면 기존 admin/organizer/gym 로그인 경로 */
export function isEmailLoginIdentifier(raw: string): boolean {
  const v = raw.trim();
  if (!v.includes("@")) return false;
  return zodEmailSafe(v);
}

function zodEmailSafe(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export function generateTemporaryPassword(length = 10): string {
  const chars =
    "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)]!;
  }
  return out;
}

export function suggestLoginIdFromFighter(input: {
  fighterCode: string;
  name: string;
}): string {
  const fromCode = input.fighterCode
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(-12);
  if (fromCode.length >= 4) return fromCode;
  const fromName = input.name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9가-힣]/g, "")
    .slice(0, 8);
  return `${fromName || "fighter"}${Date.now().toString().slice(-4)}`
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 20);
}
