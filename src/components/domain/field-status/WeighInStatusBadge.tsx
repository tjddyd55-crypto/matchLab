import type { WeighInStatus } from "@/generated/prisma";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import { getWeighInStatusLabel } from "@/lib/field-eligibility";
import { resolveWeighInMatchonStatus } from "@/lib/ui/field-status-ui";

export function WeighInStatusBadge({ status }: { status: WeighInStatus }) {
  return (
    <MatchonStatusBadge
      status={resolveWeighInMatchonStatus(status)}
      label={getWeighInStatusLabel(status)}
      size="sm"
    />
  );
}
