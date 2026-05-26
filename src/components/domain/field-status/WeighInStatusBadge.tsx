import type { WeighInStatus } from "@/generated/prisma";
import { getWeighInStatusLabel } from "@/lib/field-eligibility";
import { StatusBadge } from "@/components/shared/StatusBadge";

export function WeighInStatusBadge({ status }: { status: WeighInStatus }) {
  const label = getWeighInStatusLabel(status);
  const variant =
    status === "pass" || status === "manual_pass"
      ? "default"
      : status === "pending"
        ? "secondary"
        : "destructive";
  return <StatusBadge variant={variant} label={label} />;
}
