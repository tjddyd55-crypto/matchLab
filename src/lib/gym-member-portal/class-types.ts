/**
 * 회원 포털 그룹수업 표시용 타입 (client/server 공용).
 * server-only 서비스에서 직접 import하지 않도록 분리한다.
 */
export type MemberPortalGroupClassItem = {
  id: string;
  title: string;
  description: string | null;
  dateKey: string;
  dateLabel: string;
  timeRangeLabel: string;
  startTimeLabel: string;
  endTimeLabel: string;
  instructorName: string | null;
  location: string | null;
  capacity: number | null;
  attendingCount: number;
  waitlistCount: number;
  myStatus: "attending" | "waitlisted" | null;
  myWaitlistOrder: number | null;
  classStatus: "scheduled" | "completed" | "cancelled";
  statusLabel: string;
  canApply: boolean;
  canCancel: boolean;
  action:
    | "join"
    | "waitlist"
    | "cancel_attending"
    | "cancel_waitlist"
    | "closed"
    | "none";
  started: boolean;
  isMine: boolean;
};
