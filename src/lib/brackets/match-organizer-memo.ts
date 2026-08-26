/**
 * Match 단위 주최자 경기 운영 메모.
 * 대진표 PDF 메모 행에 출력될 수 있음 — 개인정보(연락처·주민번호 등) 입력 지양.
 */
export const MATCH_ORGANIZER_MEMO_MAX_LENGTH = 500;

export function normalizeMatchOrganizerMemo(
  raw: string | null | undefined,
): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  return trimmed.slice(0, MATCH_ORGANIZER_MEMO_MAX_LENGTH);
}

export function validateMatchOrganizerMemo(
  raw: string | null | undefined,
): { ok: true; value: string | null } | { ok: false; message: string } {
  if (raw == null || raw.trim() === "") {
    return { ok: true, value: null };
  }
  const trimmed = raw.trim();
  if (trimmed.length > MATCH_ORGANIZER_MEMO_MAX_LENGTH) {
    return {
      ok: false,
      message: `운영 메모는 ${MATCH_ORGANIZER_MEMO_MAX_LENGTH}자 이내로 입력해 주세요.`,
    };
  }
  return { ok: true, value: trimmed };
}
