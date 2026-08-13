import type { GymMembershipDurationType } from "@/generated/prisma";
import { GymMembershipDurationType as Duration } from "@/generated/prisma";

/**
 * 기간형 이용권 종료일 SSOT.
 * 종료일 = 시작일 + 기간 - 1일 (포함 일수).
 * 예: 2026-08-11 + 3개월 → 2026-11-10
 */
export function calculateMembershipEndDate(
  start: Date,
  durationType: GymMembershipDurationType,
  durationValue: number | null | undefined,
): Date | null {
  if (durationType === Duration.fixed_end) return null;
  if (!durationValue || durationValue <= 0) return null;
  const exclusive = addExclusiveDuration(start, durationType, durationValue);
  if (!exclusive) return null;
  const inclusive = new Date(exclusive.getTime());
  inclusive.setUTCDate(inclusive.getUTCDate() - 1);
  return inclusive;
}

/** @deprecated 호출부는 calculateMembershipEndDate를 사용. 동일 SSOT. */
export function addMembershipDuration(
  start: Date,
  durationType: GymMembershipDurationType,
  durationValue: number | null | undefined,
): Date | null {
  return calculateMembershipEndDate(start, durationType, durationValue);
}

function addExclusiveDuration(
  start: Date,
  durationType: GymMembershipDurationType,
  durationValue: number,
): Date | null {
  const d = new Date(start.getTime());
  if (durationType === Duration.days) {
    d.setUTCDate(d.getUTCDate() + durationValue);
    return d;
  }
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + durationValue;
  const day = d.getUTCDate();
  return new Date(Date.UTC(y + Math.floor(m / 12), m % 12, day));
}
