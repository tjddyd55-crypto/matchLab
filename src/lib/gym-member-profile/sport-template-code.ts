/**
 * Member sport template code — DB stores String (unique).
 * Prefer controlled uppercase codes; free-form arbitrary strings rejected.
 */

export const MEMBER_SPORT_TEMPLATE_CODE_PATTERN = /^[A-Z][A-Z0-9_]{1,31}$/;

/** Suggested codes for Admin create UI (not an exclusive allow-list) */
export const SUGGESTED_MEMBER_SPORT_TEMPLATE_CODES = [
  "KICKBOXING",
  "TAEKWONDO",
  "BOXING",
  "MMA",
  "JUJITSU",
  "MUAYTHAI",
] as const;

export type SuggestedMemberSportTemplateCode =
  (typeof SUGGESTED_MEMBER_SPORT_TEMPLATE_CODES)[number];

export function normalizeMemberSportTemplateCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[\s-]+/g, "_");
}

export function validateMemberSportTemplateCode(
  raw: string,
): { ok: true; code: string } | { ok: false; message: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, message: "종목 코드를 입력해 주세요." };
  }
  if (/\s/.test(trimmed)) {
    return {
      ok: false,
      message: "종목 코드에 공백을 사용할 수 없습니다. 밑줄(_)을 사용하세요.",
    };
  }
  const code = normalizeMemberSportTemplateCode(trimmed);
  if (!MEMBER_SPORT_TEMPLATE_CODE_PATTERN.test(code)) {
    return {
      ok: false,
      message:
        "종목 코드는 영문 대문자로 시작하고, 대문자·숫자·밑줄만 사용합니다 (2~32자).",
    };
  }
  return { ok: true, code };
}
