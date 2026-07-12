import type { BracketStatus } from "@/lib/enums";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import {
  getBracketGroupStatusLabel,
  resolveBracketGroupMatchonStatus,
} from "@/lib/ui/organizer-bracket-ui";
import { cn } from "@/lib/utils";

export function BracketStatusBadge({
  status,
  className,
}: {
  status: BracketStatus;
  className?: string;
}) {
  return (
    <MatchonStatusBadge
      status={resolveBracketGroupMatchonStatus(status)}
      label={getBracketGroupStatusLabel(status)}
      size="sm"
      className={cn(className)}
    />
  );
}
