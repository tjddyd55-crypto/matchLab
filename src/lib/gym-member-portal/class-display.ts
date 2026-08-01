/**
 * 회원 포털 그룹수업 표시 문구 SSOT.
 * 다른 회원 정보는 다루지 않는다.
 */
export type PortalClassAction =
  | "join"
  | "waitlist"
  | "cancel_attending"
  | "cancel_waitlist"
  | "closed"
  | "none";

export type PortalClassMarkerTone =
  | "available"
  | "attending"
  | "waitlisted"
  | "completed"
  | "cancelled"
  | "closed";

export const PORTAL_CLASS_STATUS = {
  available: "신청 가능",
  attending: "참석 예정",
  waitlisted: "대기 중",
  closed: "신청 마감",
  completed: "수업 완료",
  cancelled: "수업 취소",
} as const;

export const PORTAL_CLASS_ACTION_LABEL = {
  join: "참석하기",
  waitlist: "대기 신청",
  cancel_attending: "참석 취소",
  cancel_waitlist: "대기 취소",
} as const;

export function formatPortalClassCapacity(
  attendingCount: number,
  capacity: number | null,
): string {
  if (capacity == null) {
    return `참석 ${attendingCount}명`;
  }
  return `참석 ${attendingCount} / ${capacity}`;
}

export function formatPortalWaitlistOrder(order: number | null): string | null {
  if (order == null) return null;
  return `대기 ${order}번째`;
}

export function formatPortalTimeRangeLabel(timeRangeLabel: string): string {
  return timeRangeLabel.replace("–", "~").replace("-", "~");
}

export function resolvePortalClassMarkerTone(input: {
  classStatus: string;
  myStatus: string | null;
  started: boolean;
}): PortalClassMarkerTone {
  if (input.classStatus === "cancelled") return "cancelled";
  if (input.classStatus === "completed") return "completed";
  if (input.myStatus === "attending") return "attending";
  if (input.myStatus === "waitlisted") return "waitlisted";
  if (input.started) return "closed";
  return "available";
}
