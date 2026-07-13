import type { MatchonStatus } from "@/lib/ui/matchon-status";
import {
  getBracketMatchMatchonLabel,
  resolveBracketMatchMatchonStatus,
} from "@/lib/ui/bracket-match-ui";
import {
  matchonBlueCornerPanelClass,
  matchonBlueCornerTextClass,
  matchonInfoBannerClass,
  matchonPageDescClass,
  matchonPageEyebrowClass,
  matchonPageHeaderStackClass,
  matchonPageTitleClass,
  matchonRedCornerPanelClass,
  matchonRedCornerTextClass,
  matchonVsCardClass,
  matchonCompactTableWrapClass,
} from "@/lib/ui/matchon-shell-ui";

export { getBracketMatchMatchonLabel, resolveBracketMatchMatchonStatus };

export {
  matchonBlueCornerPanelClass,
  matchonBlueCornerTextClass,
  matchonCompactTableWrapClass,
  matchonInfoBannerClass,
  matchonPageDescClass,
  matchonPageEyebrowClass,
  matchonPageHeaderStackClass,
  matchonPageTitleClass,
  matchonRedCornerPanelClass,
  matchonRedCornerTextClass,
  matchonVsCardClass,
};

/** 심판 현장 화면 공통 입력 스타일 */
export const judgeFieldInputClass =
  "border-input bg-background h-11 w-full rounded-md border px-3 text-base shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export const judgeFieldTextareaClass =
  "border-input bg-background min-h-[5.5rem] w-full rounded-md border px-3 py-2 text-base shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** 심판 역할 배지 */
export function resolveJudgeRoleMatchonStatus(
  role: "score" | "head",
): MatchonStatus {
  return role === "head" ? "active" : "in_progress";
}

export function getJudgeRoleLabel(role: "score" | "head"): string {
  return role === "head" ? "주심판" : "채점심판";
}

/** 채점 제출 상태 */
export function resolveScoreSubmissionMatchonStatus(input: {
  submitted: boolean;
  locked?: boolean;
}): MatchonStatus {
  if (input.locked) return "completed";
  if (input.submitted) return "signature_completed";
  return "waiting";
}
