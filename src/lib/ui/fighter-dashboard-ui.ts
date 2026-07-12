import type { ApplicationStatus } from "@/generated/prisma";
import type { BracketMatchStatus } from "@/lib/enums";
import { MatchRecordOutcome } from "@/lib/enums";
import type { MatchonStatus } from "@/lib/ui/matchon-status";
import {
  getBracketMatchMatchonLabel,
  resolveBracketMatchMatchonStatus,
} from "@/lib/ui/bracket-match-ui";
import {
  publicApplicationFieldInputClass,
  publicApplicationFieldTextareaClass,
} from "@/lib/ui/public-application-ui";

export {
  getBracketMatchMatchonLabel,
  resolveBracketMatchMatchonStatus,
};

/** 선수 대시보드 공통 입력 스타일 */
export const fighterDashboardFieldInputClass = publicApplicationFieldInputClass;
export const fighterDashboardFieldTextareaClass =
  publicApplicationFieldTextareaClass;

const FIGHTER_APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  pending: "대기",
  approved: "승인",
  rejected: "반려",
  cancelled: "취소",
};

/** 신청 승인 상태 → MatchonStatusBadge */
export function resolveFighterApplicationMatchonStatus(
  status: ApplicationStatus,
): MatchonStatus {
  switch (status) {
    case "approved":
      return "approved";
    case "rejected":
      return "unapproved";
    case "cancelled":
      return "cancelled";
    case "pending":
    default:
      return "application_pending";
  }
}

export function getFighterApplicationStatusLabel(
  status: ApplicationStatus,
): string {
  return FIGHTER_APPLICATION_STATUS_LABELS[status];
}

/** 선수 화면 입금 표시 라벨 → MatchonStatusBadge */
export function resolveFighterPaymentDisplayMatchonStatus(
  label: string,
): MatchonStatus {
  if (label === "입금 확인" || label === "면제") return "paid";
  if (label === "환불 처리") return "cancelled";
  return "unpaid";
}

/** 현장 확인 라벨 → MatchonStatusBadge */
export function resolveFighterCheckInLabelMatchonStatus(
  label: string,
): MatchonStatus {
  switch (label) {
    case "현장 확인":
      return "application_completed";
    case "미출석":
    case "철회":
    case "실격":
      return "cancelled";
    case "현장 미확인":
    default:
      return "application_pending";
  }
}

/** 계체 라벨 → MatchonStatusBadge */
export function resolveFighterWeighInLabelMatchonStatus(
  label: string,
): MatchonStatus {
  switch (label) {
    case "계체 통과":
    case "수동 승인":
      return "weigh_passed";
    case "계체 실패":
    case "수동 실패":
      return "weigh_failed";
    default:
      return "application_pending";
  }
}

/** 출전 자격 → MatchonStatusBadge */
export function resolveFighterEligibilityMatchonStatus(
  isEligible: boolean,
): MatchonStatus {
  return isEligible ? "approved" : "unapproved";
}

/** 대진 배정 여부 → MatchonStatusBadge */
export function resolveFighterBracketAssignmentMatchonStatus(
  assigned: boolean,
): MatchonStatus {
  return assigned ? "application_completed" : "application_pending";
}

export function getFighterBracketAssignmentLabel(assigned: boolean): string {
  return assigned ? "대진 배정" : "대진 미배정";
}

/** 경기 결과 요약 → MatchonStatusBadge */
export function resolveFighterResultSummaryMatchonStatus(
  summary: string | null,
): MatchonStatus | null {
  if (!summary) return null;
  if (summary === "승리") return "approved";
  if (summary === "패배") return "unapproved";
  if (summary === "종료") return "completed";
  return "completed";
}

/** BracketMatchStatus 라벨 (서비스 DTO용) */
export function resolveFighterMatchStatusLabelMatchonStatus(
  status: BracketMatchStatus,
): MatchonStatus {
  return resolveBracketMatchMatchonStatus(status);
}

const FIGHTER_RECORD_OUTCOME_LABELS: Record<MatchRecordOutcome, string> = {
  win: "승",
  loss: "패",
  draw: "무",
  no_contest: "무효",
};

/** 공식 전적 결과 → MatchonStatusBadge */
export function resolveFighterRecordOutcomeMatchonStatus(
  outcome: MatchRecordOutcome,
): MatchonStatus {
  switch (outcome) {
    case MatchRecordOutcome.win:
      return "approved";
    case MatchRecordOutcome.loss:
      return "unapproved";
    case MatchRecordOutcome.draw:
      return "waiting";
    case MatchRecordOutcome.no_contest:
    default:
      return "cancelled";
  }
}

export function getFighterRecordOutcomeLabel(outcome: MatchRecordOutcome): string {
  return FIGHTER_RECORD_OUTCOME_LABELS[outcome];
}
