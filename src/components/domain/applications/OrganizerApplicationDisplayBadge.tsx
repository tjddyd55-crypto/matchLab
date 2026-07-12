"use client";

import type { ApplicationCancellationSource, ApplicationStatus, PaymentStatus } from "@/generated/prisma";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import {
  getOrganizerApplicationDisplayStatusLabel,
  getOrganizerPaymentDisplayLabel,
  resolveOrganizerApplicationDisplayStatus,
} from "@/lib/application-display-status";
import {
  resolveApplicationDisplayMatchonStatus,
  resolvePaymentDisplayMatchonStatus,
} from "@/lib/ui/application-ui";

export function OrganizerApplicationStatusBadge({
  applicationStatus,
  cancellationSource,
}: {
  applicationStatus: ApplicationStatus;
  cancellationSource: ApplicationCancellationSource | null;
}) {
  const display = resolveOrganizerApplicationDisplayStatus({
    status: applicationStatus,
    cancellationSource,
  });
  return (
    <MatchonStatusBadge
      status={resolveApplicationDisplayMatchonStatus({
        status: applicationStatus,
        cancellationSource,
      })}
      label={getOrganizerApplicationDisplayStatusLabel(display)}
      size="sm"
    />
  );
}

export function OrganizerPaymentDisplayBadge({
  paymentStatus,
}: {
  paymentStatus: PaymentStatus;
}) {
  return (
    <MatchonStatusBadge
      status={resolvePaymentDisplayMatchonStatus(paymentStatus)}
      label={getOrganizerPaymentDisplayLabel(paymentStatus)}
      size="sm"
    />
  );
}
