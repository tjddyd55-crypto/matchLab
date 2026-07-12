import { BracketStatus } from "@/lib/enums";
import type { MatchonStatus } from "@/lib/ui/matchon-status";
import { judgeFieldInputClass, judgeFieldTextareaClass } from "@/lib/ui/judge-ui";

/** 운영자 대진 상세 편집 공통 입력 스타일 */
export const organizerBracketFieldInputClass = judgeFieldInputClass;
export const organizerBracketFieldSelectClass = judgeFieldInputClass;
export const organizerBracketFieldTextareaClass = judgeFieldTextareaClass;

const BRACKET_GROUP_STATUS_LABELS: Record<BracketStatus, string> = {
  draft: "초안",
  published: "공개됨",
  ongoing: "진행중",
  finished: "종료",
};

/** 대진표 그룹 상태 → MatchonStatusBadge */
export function resolveBracketGroupMatchonStatus(
  status: BracketStatus,
): MatchonStatus {
  switch (status) {
    case BracketStatus.published:
      return "public";
    case BracketStatus.ongoing:
      return "in_progress";
    case BracketStatus.finished:
      return "completed";
    case BracketStatus.draft:
    default:
      return "application_pending";
  }
}

export function getBracketGroupStatusLabel(status: BracketStatus): string {
  return BRACKET_GROUP_STATUS_LABELS[status];
}
