import { normalizePhoneDigits } from "@/lib/phone";
import {
  validateMatchonPhone,
  maskMatchonPhone,
} from "@/server/messaging/utils/matchon-phone";

export type MessagingRecipientCandidate = {
  referenceType: string;
  referenceId: string;
  name?: string | null;
  phone: string;
  normalizedPhone: string;
  eligible: boolean;
  excludedReason?: string;
};

export function normalizeMessagingPhone(raw: string | null | undefined): string {
  return normalizePhoneDigits(raw ?? "");
}

export function buildMessagingRecipientCandidate(input: {
  referenceType: string;
  referenceId: string;
  name?: string | null;
  phone?: string | null;
}): MessagingRecipientCandidate {
  const digits = normalizeMessagingPhone(input.phone);
  if (!digits) {
    return {
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      name: input.name,
      phone: "",
      normalizedPhone: "",
      eligible: false,
      excludedReason: "전화번호 없음",
    };
  }
  const validated = validateMatchonPhone(digits);
  if (!validated.ok || !validated.normalized) {
    return {
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      name: input.name,
      phone: digits,
      normalizedPhone: digits,
      eligible: false,
      excludedReason: validated.message ?? "유효하지 않은 번호",
    };
  }
  return {
    referenceType: input.referenceType,
    referenceId: input.referenceId,
    name: input.name,
    phone: digits,
    normalizedPhone: validated.normalized,
    eligible: true,
  };
}

/** 동일 번호 중복 제거 — 첫 eligible 수신자만 유지 */
export function dedupeMessagingRecipients(
  rows: MessagingRecipientCandidate[],
): MessagingRecipientCandidate[] {
  const seen = new Set<string>();
  return rows.map((row) => {
    if (!row.eligible) return row;
    if (seen.has(row.normalizedPhone)) {
      return {
        ...row,
        eligible: false,
        excludedReason: "중복 번호",
      };
    }
    seen.add(row.normalizedPhone);
    return row;
  });
}

export function summarizeMessagingRecipients(rows: MessagingRecipientCandidate[]) {
  const requestedCount = rows.length;
  const eligible = rows.filter((r) => r.eligible);
  const excluded = rows.filter((r) => !r.eligible);
  return {
    requestedCount,
    eligibleCount: eligible.length,
    excludedCount: excluded.length,
    eligible,
    excluded,
    maskedPhones: eligible.map((r) => maskMatchonPhone(r.normalizedPhone)),
  };
}
