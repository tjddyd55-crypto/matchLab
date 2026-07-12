import type { CheckInStatus } from "@/generated/prisma";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import { getCheckInStatusLabel } from "@/lib/field-eligibility";
import { resolveCheckInMatchonStatus } from "@/lib/ui/field-status-ui";

export function CheckInStatusBadge({ status }: { status: CheckInStatus }) {
  return (
    <MatchonStatusBadge
      status={resolveCheckInMatchonStatus(status)}
      label={getCheckInStatusLabel(status)}
      size="sm"
    />
  );
}
