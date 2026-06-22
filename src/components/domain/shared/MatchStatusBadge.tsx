import { Badge } from "@/components/ui/badge";
import { BracketMatchStatus } from "@/lib/enums";
import {
  getBracketMatchStatusLabel,
  getMatchStatusBadgeVariant,
  getMatchStatusDotClassName,
  getMatchStatusLabel,
  matchStatusBadgeSizeClasses,
} from "@/lib/ui/match-status-ui";
import { cn } from "@/lib/utils";

const BRACKET_STATUS_SET = new Set<string>(Object.values(BracketMatchStatus));

function isBracketMatchStatus(
  status: string,
): status is BracketMatchStatus {
  return BRACKET_STATUS_SET.has(status);
}

export type MatchStatusBadgeSize = keyof typeof matchStatusBadgeSizeClasses;

export function MatchStatusBadge({
  status,
  label,
  size = "md",
  showDot = false,
  className,
}: {
  /** BracketMatchStatus 또는 resolver가 인식하는 문자열(phase 등) */
  status: BracketMatchStatus | string;
  label?: string;
  size?: MatchStatusBadgeSize;
  showDot?: boolean;
  className?: string;
}) {
  const displayLabel =
    label ??
    (isBracketMatchStatus(status)
      ? getBracketMatchStatusLabel(status)
      : getMatchStatusLabel(status));

  return (
    <Badge
      variant={getMatchStatusBadgeVariant(status)}
      className={cn(matchStatusBadgeSizeClasses[size], className)}
    >
      {showDot ? (
        <span
          className={cn(
            "size-1.5 shrink-0 rounded-full",
            getMatchStatusDotClassName(status),
          )}
          aria-hidden
        />
      ) : null}
      {displayLabel}
    </Badge>
  );
}

/** BracketMatchStatus 전용 alias */
export function BracketMatchStatusBadge({
  status,
  label,
  size = "md",
  showDot = false,
  className,
}: {
  status: BracketMatchStatus;
  label?: string;
  size?: MatchStatusBadgeSize;
  showDot?: boolean;
  className?: string;
}) {
  return (
    <MatchStatusBadge
      status={status}
      label={label}
      size={size}
      showDot={showDot}
      className={className}
    />
  );
}
