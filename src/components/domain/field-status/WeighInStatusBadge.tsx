import type { WeighInStatus } from "@/generated/prisma";
import { Badge } from "@/components/ui/badge";
import { getWeighInStatusLabel } from "@/lib/field-eligibility";
import { getWeighInStatusBadgeVariant } from "@/lib/ui/field-status-ui";
import { matchStatusBadgeSizeClasses } from "@/lib/ui/match-status-ui";

export function WeighInStatusBadge({ status }: { status: WeighInStatus }) {
  return (
    <Badge
      variant={getWeighInStatusBadgeVariant(status)}
      className={matchStatusBadgeSizeClasses.sm}
    >
      {getWeighInStatusLabel(status)}
    </Badge>
  );
}
