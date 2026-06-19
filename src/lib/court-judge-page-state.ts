import { BracketMatchStatus } from "@/lib/enums";
import type { CourtJudgeMatchVM } from "@/lib/services/judge-court.service";

/** 경기장 심판 화면에서 사용자에게 보여줄 운영 상태 */
export type CourtJudgeScene =
  | "active"
  | "no_matches"
  | "no_ongoing_match"
  | "all_finished"
  | "no_waiting_match";

const ACTIVE_STATUSES = new Set<BracketMatchStatus>([
  BracketMatchStatus.waiting,
  BracketMatchStatus.called,
  BracketMatchStatus.ongoing,
]);

export function deriveCourtJudgeScene(
  matches: CourtJudgeMatchVM[],
  ongoingMatchId: string | null,
): CourtJudgeScene {
  if (matches.length === 0) return "no_matches";

  if (ongoingMatchId) return "active";

  const hasActive = matches.some((m) => ACTIVE_STATUSES.has(m.status));
  if (hasActive) return "no_ongoing_match";

  const allTerminal = matches.every(
    (m) =>
      m.status === BracketMatchStatus.finished ||
      m.status === BracketMatchStatus.cancelled,
  );
  if (allTerminal) return "all_finished";

  return "no_waiting_match";
}

export function matchRequiresScoreJudge(match: CourtJudgeMatchVM): boolean {
  if (match.status === BracketMatchStatus.cancelled) return false;
  return true;
}
