import type { StatusBadgeVariant } from "@/lib/ui/status-badge-ui";

/**
 * MATCHON 전역 상태 키 — UI 노출용 SSOT
 * 내부 enum/phase는 각 도메인 resolver에서 이 키로 매핑한다.
 */
export type MatchonStatus =
  | "waiting"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "approved"
  | "unapproved"
  | "paid"
  | "unpaid"
  | "weigh_passed"
  | "weigh_failed"
  | "disqualified"
  | "application_completed"
  | "application_pending"
  | "signature_completed"
  | "signature_pending"
  | "public"
  | "private"
  | "active"
  | "inactive";

export const matchonStatusLabels: Record<MatchonStatus, string> = {
  waiting: "대기",
  in_progress: "진행중",
  completed: "경기종료",
  cancelled: "경기취소",
  approved: "승인",
  unapproved: "미승인",
  paid: "입금완료",
  unpaid: "미입금",
  weigh_passed: "계체통과",
  weigh_failed: "계체실패",
  disqualified: "실격",
  application_completed: "신청완료",
  application_pending: "신청대기",
  signature_completed: "서명완료",
  signature_pending: "서명대기",
  public: "공개",
  private: "비공개",
  active: "활성",
  inactive: "비활성",
};

const matchonStatusBadgeVariants: Record<MatchonStatus, StatusBadgeVariant> = {
  waiting: "matchWaiting",
  in_progress: "matchOngoing",
  completed: "matchFinished",
  cancelled: "matchCancelled",
  approved: "applicationApproved",
  unapproved: "applicationPending",
  paid: "paymentPaid",
  unpaid: "paymentUnpaid",
  weigh_passed: "weighPassed",
  weigh_failed: "weighFailed",
  disqualified: "weighDisqualified",
  application_completed: "applicationApproved",
  application_pending: "applicationPending",
  signature_completed: "applicationApproved",
  signature_pending: "applicationPending",
  public: "boutPublicSparring",
  private: "matchUnknown",
  active: "paymentPaid",
  inactive: "matchUnknown",
};

export function getMatchonStatusLabel(status: MatchonStatus): string {
  return matchonStatusLabels[status];
}

export function getMatchonStatusBadgeVariant(
  status: MatchonStatus,
): StatusBadgeVariant {
  return matchonStatusBadgeVariants[status];
}

/** /operation 화면용 — UI 4상태(대기/진행중/경기종료/경기취소) */
export type OperationDisplayStatus = Extract<
  MatchonStatus,
  "waiting" | "in_progress" | "completed" | "cancelled"
>;

export function resolveOperationDisplayStatus(input: {
  status: string;
  phase: string;
}): OperationDisplayStatus {
  if (input.status === "cancelled" || input.phase === "cancelled") {
    return "cancelled";
  }
  if (input.phase === "in_progress" || input.status === "ongoing") {
    return "in_progress";
  }
  if (
    input.phase === "finished" ||
    input.phase === "result_done" ||
    input.status === "finished"
  ) {
    return "completed";
  }
  return "waiting";
}
