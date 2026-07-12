import type { ApplicationStatus, PaymentStatus } from "@/generated/prisma";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import {
  getGymApplicationStatusLabel,
  resolveGymApplicationStatusMatchonStatus,
  resolvePaymentDisplayMatchonStatus,
} from "@/lib/ui/public-application-ui";
import { getMatchonStatusLabel } from "@/lib/ui/matchon-status";

export function ApplicationPaymentSummary({
  applicationStatus,
  paymentStatus,
}: {
  applicationStatus: ApplicationStatus;
  paymentStatus: PaymentStatus;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <MatchonStatusBadge
        status={resolveGymApplicationStatusMatchonStatus(applicationStatus)}
        label={getGymApplicationStatusLabel(applicationStatus)}
        size="sm"
      />
      <MatchonStatusBadge
        status={resolvePaymentDisplayMatchonStatus(paymentStatus)}
        label={getMatchonStatusLabel(
          resolvePaymentDisplayMatchonStatus(paymentStatus),
        )}
        size="sm"
      />
    </div>
  );
}
