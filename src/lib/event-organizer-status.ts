import { EventStatus, type EventStatus as EventStatusType } from "@/lib/enums";

/** 주최자 관리 화면 — 대회 운영 상태(신청 기간과 분리) */
export const ORGANIZER_EVENT_STATUS_LABELS = {
  draft: "초안",
  open: "공개",
  closed: "신청 마감",
  bracket_ready: "대진 준비",
  ongoing: "진행 중",
  finished: "종료",
  cancelled: "취소",
} satisfies Record<EventStatusType, string>;

export type OrganizerRegistrationStatus =
  | "before"
  | "open"
  | "closed"
  | "unavailable"
  | "unknown";

export function resolveOrganizerRegistrationStatus(input: {
  status: EventStatusType;
  registrationStartDate: Date | string;
  registrationEndDate: Date | string;
  now?: Date;
}): OrganizerRegistrationStatus {
  const now = input.now ?? new Date();
  const start = new Date(input.registrationStartDate);
  const end = new Date(input.registrationEndDate);

  if (input.status === EventStatus.draft || input.status === EventStatus.cancelled) {
    return "unavailable";
  }

  if (
    input.status === EventStatus.closed ||
    input.status === EventStatus.bracket_ready ||
    input.status === EventStatus.ongoing ||
    input.status === EventStatus.finished
  ) {
    return "closed";
  }

  if (input.status !== EventStatus.open) {
    return "unknown";
  }

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "unknown";
  }

  if (now < start) return "before";
  if (now > end) return "closed";
  return "open";
}

export const ORGANIZER_REGISTRATION_STATUS_LABELS: Record<
  OrganizerRegistrationStatus,
  string
> = {
  before: "신청 전",
  open: "신청 가능",
  closed: "신청 마감",
  unavailable: "신청 불가",
  unknown: "신청 기간 정보 없음",
};
