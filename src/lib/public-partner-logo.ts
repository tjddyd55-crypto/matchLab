import { toUtcDateOnly } from "@/lib/date-only";
import type { PublicPartnerType } from "@/lib/enums";

export type PublicPartnerExposureStatus =
  | "active"
  | "inactive"
  | "scheduled"
  | "ended";

export const PUBLIC_PARTNER_TYPE_LABELS: Record<PublicPartnerType, string> = {
  sponsor: "후원사",
  partner: "협력사",
  association: "단체",
  brand: "브랜드",
  media: "미디어",
  supplier: "공급사",
  other: "기타",
};

export const PUBLIC_PARTNER_EXPOSURE_STATUS_LABELS: Record<
  PublicPartnerExposureStatus,
  string
> = {
  active: "노출 중",
  inactive: "비활성",
  scheduled: "노출 예정",
  ended: "노출 종료",
};

export const PUBLIC_PARTNER_TYPE_VALUES = [
  "sponsor",
  "partner",
  "association",
  "brand",
  "media",
  "supplier",
  "other",
] as const satisfies readonly PublicPartnerType[];

export function parsePublicPartnerType(raw: string): PublicPartnerType {
  if ((PUBLIC_PARTNER_TYPE_VALUES as readonly string[]).includes(raw)) {
    return raw as PublicPartnerType;
  }
  return "partner";
}

/**
 * 공개 메인 노출 윈도우 (date-only UTC, endsAt 당일 포함).
 */
export function isPublicPartnerInExposureWindow(
  input: {
    startsAt: Date | null;
    endsAt: Date | null;
  },
  now: Date = new Date(),
): boolean {
  const today = toUtcDateOnly(now);
  if (input.startsAt && toUtcDateOnly(input.startsAt) > today) return false;
  if (input.endsAt && toUtcDateOnly(input.endsAt) < today) return false;
  return true;
}

/** 관리자 목록·배지용 상태 SSOT */
export function computePublicPartnerLogoStatus(
  input: {
    isActive: boolean;
    deletedAt?: Date | null;
    startsAt: Date | null;
    endsAt: Date | null;
  },
  now: Date = new Date(),
): PublicPartnerExposureStatus {
  if (input.deletedAt) return "ended";
  if (!input.isActive) return "inactive";
  const today = toUtcDateOnly(now);
  if (input.startsAt && toUtcDateOnly(input.startsAt) > today) {
    return "scheduled";
  }
  if (input.endsAt && toUtcDateOnly(input.endsAt) < today) {
    return "ended";
  }
  return "active";
}

export function isPublicPartnerVisibleOnHome(
  input: {
    isActive: boolean;
    deletedAt?: Date | null;
    startsAt: Date | null;
    endsAt: Date | null;
    logoUrl?: string | null;
  },
  now: Date = new Date(),
): boolean {
  if (input.deletedAt) return false;
  if (!input.isActive) return false;
  if (!input.logoUrl?.trim()) return false;
  return isPublicPartnerInExposureWindow(input, now);
}
