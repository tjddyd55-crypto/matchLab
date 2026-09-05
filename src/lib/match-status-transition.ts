import { BracketMatchStatus } from "@/generated/prisma";
import { AppError } from "@/lib/errors/app-error";

/** 취소 후 복구 가능한 운영 상태 (ready=called, in_progress=ongoing) */
export const CANCELLED_RECOVERY_STATUSES = new Set<BracketMatchStatus>([
  BracketMatchStatus.waiting,
  BracketMatchStatus.called,
  BracketMatchStatus.ongoing,
]);

const FIELD_OPS_STATUSES = new Set<BracketMatchStatus>([
  BracketMatchStatus.waiting,
  BracketMatchStatus.called,
  BracketMatchStatus.ongoing,
  BracketMatchStatus.finished,
  BracketMatchStatus.delayed,
  BracketMatchStatus.cancelled,
]);

/**
 * 경기운영(주최자·현장) 화면 — BracketMatch.status 필드만 변경한다.
 * MatchResult·JudgeScore·bracket progression 은 건드리지 않는다.
 *
 * 운영자는 waiting/called/ongoing/finished/cancelled 사이 자유 전환 가능
 * (동일 상태 제외, backward transition 포함).
 */
export function assertBracketMatchStatusTransition(
  from: BracketMatchStatus,
  to: BracketMatchStatus,
  _options?: { hasOfficialResults?: boolean },
): void {
  if (from === to) return;

  if (!FIELD_OPS_STATUSES.has(from) || !FIELD_OPS_STATUSES.has(to)) {
    throw new AppError(
      "CONFLICT",
      `허용되지 않는 경기 상태 전이입니다 (${from} → ${to}).`,
    );
  }
}

export function canRecoverCancelledMatchStatus(
  to: BracketMatchStatus,
  _hasOfficialResults?: boolean,
): boolean {
  return CANCELLED_RECOVERY_STATUSES.has(to);
}
