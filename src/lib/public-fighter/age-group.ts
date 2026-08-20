import { toUtcDateOnly } from "@/lib/date-only";

function completedAgeFromBirthDate(
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

/** 대외 공개용 연령부 — 생년월일 전체는 노출하지 않음 */
export function publicAgeGroupFromBirthDate(
  birthDate: Date | null | undefined,
  referenceDate?: Date,
): string | null {
  if (!birthDate) return null;
  const age = completedAgeFromBirthDate(birthDate, referenceDate);
  if (age < 13) return "초등부";
  if (age < 16) return "중등부";
  if (age < 19) return "고등부";
  return "일반부";
}
