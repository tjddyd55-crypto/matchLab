import type { ApplicationStatus } from "@/generated/prisma";
import type { MatchonStatus } from "@/lib/ui/matchon-status";
import { resolvePaymentDisplayMatchonStatus } from "@/lib/ui/application-ui";

/** 공개 신청·등록 화면 공통 입력 스타일 */
export const publicApplicationFieldInputClass =
  "border-input bg-background h-11 w-full rounded-md border px-3 text-base shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export const publicApplicationFieldSelectClass = publicApplicationFieldInputClass;

export const publicApplicationFieldTextareaClass =
  "border-input bg-background min-h-[5.5rem] w-full rounded-md border px-3 py-2 text-base shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const APPLICATION_DOCUMENT_STATUS_LABELS: Record<string, string> = {
  draft: "작성 중",
  waiting_athlete_signature: "선수 서명 대기",
  waiting_guardian_signature: "보호자 동의 대기",
  completed: "작성 완료",
  submitted: "제출됨",
  rejected: "반려",
};

/** 공식 PDF 신청서 문서 상태 → MatchonStatusBadge */
export function resolveApplicationDocumentMatchonStatus(
  status: string,
): MatchonStatus {
  switch (status) {
    case "completed":
    case "submitted":
      return "application_completed";
    case "waiting_athlete_signature":
    case "waiting_guardian_signature":
      return "signature_pending";
    case "rejected":
      return "cancelled";
    case "draft":
    default:
      return "application_pending";
  }
}

export function getApplicationDocumentStatusLabel(status: string): string {
  return APPLICATION_DOCUMENT_STATUS_LABELS[status] ?? status;
}

/** 서명·동의 완료 여부 → MatchonStatusBadge */
export function resolveSignatureConsentMatchonStatus(
  completed: boolean,
): MatchonStatus {
  return completed ? "signature_completed" : "signature_pending";
}

export function getSignatureConsentLabel(
  completed: boolean,
  kind: "signature" | "consent",
): string {
  if (kind === "consent") {
    return completed ? "동의완료" : "동의대기";
  }
  return completed ? "서명완료" : "서명대기";
}

/** 체육관 신청 목록 — ApplicationStatus → MatchonStatusBadge */
export function resolveGymApplicationStatusMatchonStatus(
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

export function getGymApplicationStatusLabel(status: ApplicationStatus): string {
  switch (status) {
    case "approved":
      return "승인";
    case "rejected":
      return "미승인";
    case "cancelled":
      return "취소";
    case "pending":
    default:
      return "신청대기";
  }
}

export { resolvePaymentDisplayMatchonStatus };

/** 일괄 신청 행 상태 → MatchonStatusBadge */
export function resolveBulkApplicationRowMatchonStatus(input: {
  alreadyApplied: boolean;
  checked: boolean;
  hasDivision: boolean;
}): MatchonStatus {
  if (input.alreadyApplied) return "application_completed";
  if (!input.checked) return "waiting";
  if (!input.hasDivision) return "application_pending";
  return "approved";
}

export function getBulkApplicationRowStatusLabel(input: {
  alreadyApplied: boolean;
  checked: boolean;
  hasDivision: boolean;
}): string {
  if (input.alreadyApplied) return "이미 신청됨";
  if (!input.checked) return "미선택";
  if (!input.hasDivision) return "경기구분 선택 필요";
  return "신청 가능";
}
