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

/** 리스트 기본 선택: 진행중 → 대기/준비 → 첫 경기 */
export function resolveDefaultSelectedMatchId(
  matches: CourtJudgeMatchVM[],
  ongoingMatchId: string | null,
): string | null {
  if (ongoingMatchId) return ongoingMatchId;

  const nextActive = matches.find(
    (m) =>
      m.status === BracketMatchStatus.ongoing ||
      m.status === BracketMatchStatus.called ||
      m.status === BracketMatchStatus.waiting,
  );
  if (nextActive) return nextActive.matchId;

  return matches[0]?.matchId ?? null;
}

const HEAD_ACTION_STATUSES = new Set<BracketMatchStatus>([
  BracketMatchStatus.waiting,
  BracketMatchStatus.called,
  BracketMatchStatus.ongoing,
]);

export function isHeadActionableMatch(match: CourtJudgeMatchVM): boolean {
  return HEAD_ACTION_STATUSES.has(match.status);
}

/** 주심판 메인 영역 — 진행/준비/대기 경기만. 종료·취소는 리스트에서만 확인 */
export function resolveHeadActionMatchId(
  matches: CourtJudgeMatchVM[],
  ongoingMatchId: string | null,
  selectedMatchId: string | null,
): string | null {
  if (ongoingMatchId) return ongoingMatchId;

  const selected = selectedMatchId
    ? matches.find((m) => m.matchId === selectedMatchId)
    : null;
  if (selected && isHeadActionableMatch(selected)) {
    return selected.matchId;
  }

  const preparing = matches.find((m) => m.status === BracketMatchStatus.called);
  if (preparing) return preparing.matchId;

  const waiting = matches.find((m) => m.status === BracketMatchStatus.waiting);
  return waiting?.matchId ?? null;
}
