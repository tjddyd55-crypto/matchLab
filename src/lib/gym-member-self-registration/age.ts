import { toUtcDateOnly } from "@/lib/date-only";
import { GYM_MEMBER_SELF_REG_ADULT_MIN_AGE } from "@/lib/gym-member-self-registration/constants";

export function getCompletedAgeYears(
  birthDate: Date,
  referenceDate: Date = new Date(),
): number {
  const birth = toUtcDateOnly(birthDate);
  const ref = toUtcDateOnly(referenceDate);
  let age = ref.getUTCFullYear() - birth.getUTCFullYear();
  const m = ref.getUTCMonth() - birth.getUTCMonth();
  const d = ref.getUTCDate() - birth.getUTCDate();
  if (m < 0 || (m === 0 && d < 0)) age -= 1;
  return age;
}

export function isMinorBirthDate(
  birthDate: Date,
  referenceDate: Date = new Date(),
): boolean {
  return getCompletedAgeYears(birthDate, referenceDate) < GYM_MEMBER_SELF_REG_ADULT_MIN_AGE;
}

export function formatCompletedAgeLabel(birthDate: Date): string {
  const age = getCompletedAgeYears(birthDate);
  return `만 ${age}세`;
}
