import type { GymMembershipDurationType } from "@/generated/prisma";
import { GymMembershipDurationType as Duration } from "@/generated/prisma";

/**
 * 기간형 이용권 종료일 SSOT.
 *
 * 종료일 = (시작일 + 기간, calendar-month clamp) - 1일.
 * 예: 2026-08-11 + 3개월 → 2026-11-10
 *
 * 월 가산 시 JS Date overflow(1/31 → 3/3)를 쓰지 않는다.
 * 목표 월에 같은 일자가 없으면 그 달의 마지막 날로 clamp한 뒤
 * inclusive(-1일)를 적용한다.
 * 예: 2026-01-31 + 1개월 → exclusive 2026-02-28 → 종료일 2026-02-27
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

function utcDaysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function addExclusiveDuration(
  start: Date,
  durationType: GymMembershipDurationType,
  durationValue: number,
): Date | null {
  if (durationType === Duration.days) {
    const d = new Date(start.getTime());
    d.setUTCDate(d.getUTCDate() + durationValue);
    return d;
  }
  const startYear = start.getUTCFullYear();
  const startMonth = start.getUTCMonth();
  const startDay = start.getUTCDate();
  const totalMonths = startMonth + durationValue;
  const targetYear = startYear + Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12;
  const clampedDay = Math.min(startDay, utcDaysInMonth(targetYear, targetMonth));
  return new Date(Date.UTC(targetYear, targetMonth, clampedDay));
}
