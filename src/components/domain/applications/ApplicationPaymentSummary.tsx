import { ApplicationStatusBadge } from "@/components/domain/applications/ApplicationStatusBadge";
import { PaymentStatusBadge } from "@/components/domain/payments/PaymentStatusBadge";
import type { ApplicationStatus, PaymentStatus } from "@/generated/prisma";

export function ApplicationPaymentSummary({
  applicationStatus,
  paymentStatus,
}: {
  applicationStatus: ApplicationStatus;
  paymentStatus: PaymentStatus;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <ApplicationStatusBadge status={applicationStatus} />
      <PaymentStatusBadge status={paymentStatus} />
    </div>
  );
}
