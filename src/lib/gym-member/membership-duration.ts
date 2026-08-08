import type { GymMembershipDurationType } from "@/generated/prisma";
import { GymMembershipDurationType as Duration } from "@/generated/prisma";

/** 이용권 기간 → endsAt (UTC date-only). fixed_end / 값 없음 → null */
export function addMembershipDuration(
  start: Date,
  durationType: GymMembershipDurationType,
  durationValue: number | null | undefined,
): Date | null {
  if (durationType === Duration.fixed_end) return null;
  if (!durationValue || durationValue <= 0) return null;
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
