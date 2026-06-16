import { BracketMatchStatus } from "@/generated/prisma";
import { AppError } from "@/lib/errors/app-error";

const terminal = new Set<BracketMatchStatus>([BracketMatchStatus.cancelled]);

/** `docs/status-machine.md` §5 MVP 허용 전이 */
export function assertBracketMatchStatusTransition(
  from: BracketMatchStatus,
  to: BracketMatchStatus,
): void {
  if (from === to) return;
  if (terminal.has(from)) {
    throw new AppError(
      "CONFLICT",
      "취소된 경기의 상태를 변경할 수 없습니다.",
    );
  }
  if (to === BracketMatchStatus.cancelled) return;

  const allowed: Record<BracketMatchStatus, Set<BracketMatchStatus>> = {
    [BracketMatchStatus.waiting]: new Set([
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
    [BracketMatchStatus.cancelled]: new Set(),
  };

  const ok = allowed[from]?.has(to);
  if (!ok) {
    throw new AppError(
      "CONFLICT",
      `허용되지 않는 경기 상태 전이입니다 (${from} → ${to}).`,
    );
  }
}
