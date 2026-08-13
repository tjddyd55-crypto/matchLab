import {
  getGymMemberExpirationDisplay,
  todayUtcDateOnly,
} from "@/lib/gym-member-membership-status";

export function formatMembershipPeriodRemaining(input: {
  durationType?: string | null;
  durationValue?: number | null;
  endsAt?: Date | string | null;
  importMeta?: unknown;
  todayUtc?: Date;
}): string | null {
  const meta =
    input.importMeta && typeof input.importMeta === "object"
      ? (input.importMeta as Record<string, unknown>)
      : {};
  const remainingSessions =
    typeof meta.remainingSessionsText === "string"
      ? meta.remainingSessionsText.trim()
      : "";
  if (remainingSessions) {
    if (/회/.test(remainingSessions)) {
      return remainingSessions.startsWith("잔여")
        ? remainingSessions
        : `잔여 ${remainingSessions}`;
    }
    return `잔여 ${remainingSessions}회`;
  }

  const periodText =
    typeof meta.periodText === "string" ? meta.periodText.trim() : "";
  const durationLabel =
    input.durationType === "months" && input.durationValue
      ? `${input.durationValue}개월`
      : input.durationType === "days" && input.durationValue
        ? `${input.durationValue}일`
        : periodText || null;
  const dday = input.endsAt
    ? getGymMemberExpirationDisplay(
        input.endsAt,
        input.todayUtc ?? todayUtcDateOnly(),
      )
    : null;
  if (durationLabel && dday && dday !== "—") {
    return `${durationLabel} · ${dday}`;
  }
  return durationLabel || (dday && dday !== "—" ? dday : null);
}
