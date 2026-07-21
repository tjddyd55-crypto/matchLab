/**
 * 이용권 만료 표시 SSOT — 서버·클라이언트 공유.
 * date-only는 UTC 자정 기준. hydration 불일치 방지.
 */

export type GymMemberStoredStatus = "active" | "paused" | "withdrawn";

export type GymMemberMembershipDisplayStatus =
  | "active"
  | "expiring"
  | "expired"
  | "paused"
  | "withdrawn"
  | "no_plan";

export type GymMemberMembershipStatusInput = {
  memberStatus: GymMemberStoredStatus;
  endsAt: Date | string | null | undefined;
  /** 테스트·SSR 고정용. 미지정 시 오늘 UTC date-only */
  todayUtc?: Date;
};

const EXPIRING_WITHIN_DAYS = 7;

function toUtcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function todayUtcDateOnly(now = new Date()): Date {
  return new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
  );
}

function parseEndsAt(endsAt: Date | string): Date {
  const d = typeof endsAt === "string" ? new Date(endsAt) : endsAt;
  return toUtcMidnight(d);
}

/** endsAt - today (일수). 오늘 만료 = 0, 지남 = 음수 */
export function daysUntilEndsAt(
  endsAt: Date | string,
  todayUtc: Date = todayUtcDateOnly(),
): number {
  const end = parseEndsAt(endsAt);
  const today = toUtcMidnight(todayUtc);
  return Math.round((end.getTime() - today.getTime()) / 86_400_000);
}

export function computeGymMemberMembershipStatus(
  input: GymMemberMembershipStatusInput,
): GymMemberMembershipDisplayStatus {
  if (input.memberStatus === "withdrawn") return "withdrawn";
  if (input.memberStatus === "paused") return "paused";

  if (!input.endsAt) return "no_plan";

  const today = input.todayUtc
    ? toUtcMidnight(input.todayUtc)
    : todayUtcDateOnly();
  const days = daysUntilEndsAt(input.endsAt, today);

  if (days < 0) return "expired";
  if (days <= EXPIRING_WITHIN_DAYS) return "expiring";
  return "active";
}

export function getGymMemberMembershipStatusLabel(
  status: GymMemberMembershipDisplayStatus,
): string {
  switch (status) {
    case "active":
      return "이용 중";
    case "expiring":
      return "만료 예정";
    case "expired":
      return "만료";
    case "paused":
      return "휴회";
    case "withdrawn":
      return "퇴회";
    case "no_plan":
      return "이용권 없음";
    default:
      return status;
  }
}

export function getGymMemberExpirationDisplay(
  endsAt: Date | string | null | undefined,
  todayUtc: Date = todayUtcDateOnly(),
): string {
  if (!endsAt) return "—";
  const days = daysUntilEndsAt(endsAt, todayUtc);
  if (days > 0) return `D-${days}`;
  if (days === 0) return "오늘 만료";
  return `${Math.abs(days)}일 지남`;
}

export function getGymMemberStoredStatusLabel(
  status: GymMemberStoredStatus,
): string {
  switch (status) {
    case "active":
      return "이용 중";
    case "paused":
      return "휴회";
    case "withdrawn":
      return "퇴회";
    default:
      return status;
  }
}
