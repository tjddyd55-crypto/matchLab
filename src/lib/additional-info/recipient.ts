import type { AdditionalInfoRecipientType } from "@/generated/prisma";
import { isMinorBirthDate } from "@/lib/gym-member-self-registration/age";

export type AdditionalInfoRecipientOk = {
  ok: true;
  recipientType: AdditionalInfoRecipientType;
  phone: string;
  maskedPhone: string;
  isMinor: boolean;
};

export type AdditionalInfoRecipientErr = {
  ok: false;
  code: "MISSING_ATHLETE_PHONE" | "MISSING_GUARDIAN_PHONE";
  message: string;
  recipientType: AdditionalInfoRecipientType;
  isMinor: boolean;
};

export type AdditionalInfoRecipientResult =
  | AdditionalInfoRecipientOk
  | AdditionalInfoRecipientErr;

function digitsOnly(raw: string | null | undefined): string {
  const d = (raw ?? "").replace(/\D/g, "");
  // legacy placeholder "-" / empty
  if (!d || (raw ?? "").trim() === "-") return "";
  return d;
}

/** 로그/표시용 — 010-****-5678 (messaging 의존 없이 client-safe) */
function maskPhone(input: string): string {
  const d = digitsOnly(input);
  if (!d) return "";
  if (d.length < 7) return "***";
  return `${d.slice(0, 3)}-****-${d.slice(-4)}`;
}

/**
 * 성인 → 선수 연락처 / 미성년 → 보호자 연락처.
 * 연락처 없음은 레거시 신청을 무효화하지 않고 요청만 차단한다.
 */
export function resolveAdditionalInfoRecipient(input: {
  birthDate: Date | string | null | undefined;
  athletePhone: string | null | undefined;
  guardianPhone: string | null | undefined;
  referenceDate?: Date;
}): AdditionalInfoRecipientResult {
  const birth =
    input.birthDate instanceof Date
      ? input.birthDate
      : input.birthDate
        ? new Date(input.birthDate)
        : null;
  const isMinor = birth ? isMinorBirthDate(birth, input.referenceDate) : false;

  if (isMinor) {
    const phone = digitsOnly(input.guardianPhone);
    if (!phone) {
      return {
        ok: false,
        code: "MISSING_GUARDIAN_PHONE",
        message:
          "미성년 선수는 보호자 연락처가 필요합니다. 신청자 정보에서 보호자 연락처를 입력해 주세요.",
        recipientType: "GUARDIAN",
        isMinor: true,
      };
    }
    return {
      ok: true,
      recipientType: "GUARDIAN",
      phone,
      maskedPhone: maskPhone(phone),
      isMinor: true,
    };
  }

  const phone = digitsOnly(input.athletePhone);
  if (!phone) {
    return {
      ok: false,
      code: "MISSING_ATHLETE_PHONE",
      message:
        "선수 연락처가 없습니다. 신청자 정보에서 선수 연락처를 입력해 주세요.",
      recipientType: "ATHLETE",
      isMinor: false,
    };
  }
  return {
    ok: true,
    recipientType: "ATHLETE",
    phone,
    maskedPhone: maskPhone(phone),
    isMinor: false,
  };
}
