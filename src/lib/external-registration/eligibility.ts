import { EventStatus } from "@/generated/prisma";
import { AppError } from "@/lib/errors/app-error";

/** 외부 링크에서 선수등록 불가인 Event status (취소/종료/마감 운영상태) */
const EXTERNAL_REGISTRATION_BLOCKED_STATUSES = new Set<EventStatus>([
  EventStatus.cancelled,
  EventStatus.closed,
  EventStatus.finished,
]);

/**
 * 외부 체육관 등록 링크 eligibility.
 * 주최자 직접등록과 같이 EventStatus.open 전용에 묶지 않는다.
 * — draft/open/bracket_ready/ongoing + 접수기간 내면 허용
 * — cancelled/closed/finished 또는 접수기간 외면 차단
 */
export function resolveExternalRegistrationClosedReason(input: {
  status: EventStatus;
  registrationStartDate: Date;
  registrationEndDate: Date;
  now?: Date;
}): string | null {
  const now = input.now ?? new Date();

  if (EXTERNAL_REGISTRATION_BLOCKED_STATUSES.has(input.status)) {
    if (input.status === EventStatus.cancelled) {
      return "취소된 대회입니다. 자세한 내용은 대회 주최자에게 문의해 주세요.";
    }
    if (input.status === EventStatus.finished) {
      return "종료된 대회입니다. 자세한 내용은 대회 주최자에게 문의해 주세요.";
    }
    return "선수 접수가 마감되었거나 대회가 종료되었습니다. 자세한 내용은 대회 주최자에게 문의해 주세요.";
  }

  if (now.getTime() < input.registrationStartDate.getTime()) {
    return "선수 접수가 아직 시작되지 않았습니다.";
  }
  if (now.getTime() > input.registrationEndDate.getTime()) {
    return "선수 접수가 마감되었습니다.";
  }

  return null;
}

export function assertExternalRegistrationEligible(event: {
  status: EventStatus;
  registrationStartDate: Date;
  registrationEndDate: Date;
}): void {
  const reason = resolveExternalRegistrationClosedReason(event);
  if (reason) {
    throw new AppError("FORBIDDEN", reason);
  }
}
