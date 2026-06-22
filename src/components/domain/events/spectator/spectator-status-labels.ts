import type { BracketMatchStatus } from "@/lib/enums";
import type { LiveStreamStatus } from "@/lib/enums";
import {
  bracketMatchStatusBadgeVariant,
  bracketMatchStatusLabel,
  matchStatusBadgeTypography,
} from "@/lib/match-status-display";
import { badgeVariants } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** @deprecated bracketMatchStatusLabel 사용 */
export const spectatorMatchStatusLabel = bracketMatchStatusLabel;

/** @deprecated BracketMatchStatusBadge 또는 bracketMatchStatusBadgeVariant 사용 */
export function spectatorMatchStatusBadgeClass(
  status: BracketMatchStatus,
): string {
  const variant = bracketMatchStatusBadgeVariant(status);
  return cn(badgeVariants({ variant }), matchStatusBadgeTypography);
}

export function spectatorLiveStatusLabel(status: LiveStreamStatus): string {
  switch (status) {
    case "scheduled":
      return "준비중";
    case "live":
      return "방송중";
    case "ended":
      return "종료";
    case "hidden":
      return "비공개";
    default:
      return status;
  }
}

/** 라이브 방송 상태 배지 — 진행중 경기와 동일 색상 체계 */
export function spectatorLiveStatusBadgeClass(
  status: LiveStreamStatus,
): string {
  if (status === "live") {
    return spectatorMatchStatusBadgeClass("ongoing");
  }
  return cn(
    badgeVariants({ variant: "matchWaiting" }),
    matchStatusBadgeTypography,
  );
}
