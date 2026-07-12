import { Badge } from "@/components/ui/badge";
import {
  getMatchonStatusBadgeVariant,
  getMatchonStatusLabel,
  type MatchonStatus,
} from "@/lib/ui/matchon-status";
import { statusBadgeSizeClasses } from "@/lib/ui/status-badge-ui";
import { cn } from "@/lib/utils";

export type MatchonStatusBadgeSize = keyof typeof statusBadgeSizeClasses;

export function MatchonStatusBadge({
  status,
  label,
  size = "md",
  className,
}: {
  status: MatchonStatus;
  label?: string;
  size?: MatchonStatusBadgeSize;
  className?: string;
}) {
  const text = label ?? getMatchonStatusLabel(status);

  return (
    <Badge
      variant={getMatchonStatusBadgeVariant(status)}
      title={text}
      className={cn(
        statusBadgeSizeClasses[size],
        "max-w-[min(100%,16rem)] truncate",
        className,
      )}
    >
      {text}
    </Badge>
  );
}
