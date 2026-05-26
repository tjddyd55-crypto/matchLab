import type { CheckInStatus } from "@/generated/prisma";
import { getCheckInStatusLabel } from "@/lib/field-eligibility";
import { StatusBadge } from "@/components/shared/StatusBadge";

export function CheckInStatusBadge({ status }: { status: CheckInStatus }) {
  const label = getCheckInStatusLabel(status);
  const variant =
    status === "checked_in"
      ? "default"
      : status === "pending"
        ? "secondary"
        : "destructive";
  return <StatusBadge variant={variant} label={label} />;
}
