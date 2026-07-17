import { BracketMatchStatus } from "@/generated/prisma";
import { AppError } from "@/lib/errors/app-error";

/** 취소 후 복구 가능한 운영 상태 (ready=called, in_progress=ongoing) */
export const CANCELLED_RECOVERY_STATUSES = new Set<BracketMatchStatus>([
  BracketMatchStatus.waiting,
  BracketMatchStatus.called,
  BracketMatchStatus.ongoing,
]);

/**
 * `docs/status-machine.md` §5 허용 전이.
 * 취소(cancelled)는 결과 없는 경우 waiting/called/ongoing으로 복구 가능.
 */
export function assertBracketMatchStatusTransition(
  from: BracketMatchStatus,
  to: BracketMatchStatus,
  options?: { hasOfficialResults?: boolean },
): void {
  if (from === to) return;

  if (from === BracketMatchStatus.cancelled) {
    if (!CANCELLED_RECOVERY_STATUSES.has(to)) {
      throw new AppError(
        "CONFLICT",
        "취소된 경기는 대기·경기준비·경기진행중으로만 복구할 수 있습니다.",
      );
    }
    if (options?.hasOfficialResults) {
      throw new AppError(
        "CONFLICT",
        "공식 결과가 있는 취소 경기는 결과 초기화 후 복구할 수 있습니다.",
      );
    }
    return;
  }

  if (to === BracketMatchStatus.cancelled) return;

  const allowed: Record<BracketMatchStatus, Set<BracketMatchStatus>> = {
    [BracketMatchStatus.waiting]: new Set([
      BracketMatchStatus.called,
      BracketMatchStatus.ongoing,
      BracketMatchStatus.finished,
      BracketMatchStatus.cancelled,
    ]),
    [BracketMatchStatus.called]: new Set([
      BracketMatchStatus.ongoing,
      BracketMatchStatus.finished,
      BracketMatchStatus.cancelled,
    ]),
    [BracketMatchStatus.ongoing]: new Set([
      BracketMatchStatus.waiting,
      BracketMatchStatus.finished,
      BracketMatchStatus.cancelled,
    ]),
    [BracketMatchStatus.delayed]: new Set([
      BracketMatchStatus.waiting,
      BracketMatchStatus.ongoing,
      BracketMatchStatus.finished,
      BracketMatchStatus.cancelled,
    ]),
    [BracketMatchStatus.finished]: new Set([]),
    [BracketMatchStatus.cancelled]: CANCELLED_RECOVERY_STATUSES,
  };

  const ok = allowed[from]?.has(to);
  if (!ok) {
    throw new AppError(
      "CONFLICT",
      `허용되지 않는 경기 상태 전이입니다 (${from} → ${to}).`,
    );
  }
}

export function canRecoverCancelledMatchStatus(
  to: BracketMatchStatus,
  hasOfficialResults: boolean,
): boolean {
  if (!CANCELLED_RECOVERY_STATUSES.has(to)) return false;
  return !hasOfficialResults;
}
