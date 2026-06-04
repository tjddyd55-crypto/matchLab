import type { Prisma } from "@/generated/prisma";
import { toUtcDateOnly } from "@/lib/date-only";
import { normalizePhoneDigits } from "@/lib/phone";

const ACTIVE_HISTORY = {
  status: "active",
  endDate: null,
} as const;

export function activeGymHistoryWhere(
  gymId: string,
): Prisma.FighterGymHistoryWhereInput {
  return {
    gymId,
    ...ACTIVE_HISTORY,
  };
}

export function fighterIdentityDayRange(birthDate: Date): {
  gte: Date;
  lt: Date;
} {
  const dayStart = toUtcDateOnly(birthDate);
  const dayEnd = new Date(dayStart.getTime() + 86400000);
  return { gte: dayStart, lt: dayEnd };
}

export function normalizeGymFighterPhone(phone?: string): string {
  const digits = normalizePhoneDigits(phone ?? "");
  return digits.length > 0 ? digits : "";
}
