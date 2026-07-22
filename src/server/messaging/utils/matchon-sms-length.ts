/**
 * MATCHON SMS/LMS 길이 SSOT.
 * 알리고 관례: SMS ≈ 90바이트(EUC-KR), LMS ≤ 2000바이트.
 * 단가 계산은 하지 않는다.
 */

export type MatchonSmsClassification = {
  type: "sms" | "lms";
  byteLength: number;
  characterLength: number;
  requiresSubject: boolean;
  isValid: boolean;
  validationMessage?: string;
};

/** EUC-KR 근사: ASCII 1바이트, 그 외(한글 등) 2바이트 */
export function estimateEucKrByteLength(text: string): number {
  let bytes = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    bytes += code <= 0x7f ? 1 : 2;
  }
  return bytes;
}

const SMS_MAX_BYTES = 90;
const LMS_MAX_BYTES = 2000;
const SUBJECT_MAX_CHARS = 40;

export function classifyMatchonSmsMessage(params: {
  body: string;
  subject?: string | null;
}): MatchonSmsClassification {
  const body = params.body ?? "";
  const subject = (params.subject ?? "").trim();
  const byteLength = estimateEucKrByteLength(body);
  const characterLength = [...body].length;
  const type = byteLength <= SMS_MAX_BYTES ? "sms" : "lms";
  const requiresSubject = type === "lms";

  if (!body.trim()) {
    return {
      type,
      byteLength,
      characterLength,
      requiresSubject,
      isValid: false,
      validationMessage: "본문이 비어 있습니다.",
    };
  }
  if (byteLength > LMS_MAX_BYTES) {
    return {
      type: "lms",
      byteLength,
      characterLength,
      requiresSubject: true,
      isValid: false,
      validationMessage: `본문이 LMS 최대 길이(${LMS_MAX_BYTES}바이트)를 초과합니다.`,
    };
  }
  if (requiresSubject && !subject) {
    return {
      type,
      byteLength,
      characterLength,
      requiresSubject,
      isValid: false,
      validationMessage: "LMS는 제목(subject)이 필요합니다.",
    };
  }
  if (subject && [...subject].length > SUBJECT_MAX_CHARS) {
    return {
      type,
      byteLength,
      characterLength,
      requiresSubject,
      isValid: false,
      validationMessage: `제목은 ${SUBJECT_MAX_CHARS}자를 초과할 수 없습니다.`,
    };
  }
  return {
    type,
    byteLength,
    characterLength,
    requiresSubject,
    isValid: true,
  };
}
