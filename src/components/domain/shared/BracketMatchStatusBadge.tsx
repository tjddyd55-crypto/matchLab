import { Badge } from "@/components/ui/badge";
import type { BracketMatchStatus } from "@/lib/enums";
import {
  bracketMatchStatusBadgeVariant,
  bracketMatchStatusLabel,
  matchStatusBadgeTypography,
} from "@/lib/match-status-display";
import { cn } from "@/lib/utils";

export function BracketMatchStatusBadge({
  status,
  label,
  className,
}: {
  status: BracketMatchStatus;
  /** 특수 문구(예: 심판 현재 경기) — 미지정 시 SSOT 라벨 */
  label?: string;
  className?: string;
}) {
  return (
    <Badge
      variant={bracketMatchStatusBadgeVariant(status)}
      className={cn(matchStatusBadgeTypography, className)}
    >
      {label ?? bracketMatchStatusLabel(status)}
    </Badge>
  );
}
