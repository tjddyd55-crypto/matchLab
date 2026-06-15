"use client";

import type { ApplicationCancellationSource, ApplicationStatus, PaymentStatus } from "@/generated/prisma";
import {
  getOrganizerApplicationDisplayStatusLabel,
  getOrganizerPaymentDisplayLabel,
  isPaidForOrganizerDisplay,
  resolveOrganizerApplicationDisplayStatus,
} from "@/lib/application-display-status";
import { StatusBadge } from "@/components/shared/StatusBadge";

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
  const label = getOrganizerApplicationDisplayStatusLabel(display);
  const variant =
    display === "approved"
      ? "default"
      : display === "organizer_cancelled" || display === "gym_cancelled"
        ? "destructive"
        : "secondary";
  return <StatusBadge variant={variant} label={label} />;
}

export function OrganizerPaymentDisplayBadge({
  paymentStatus,
}: {
  paymentStatus: PaymentStatus;
}) {
  const label = getOrganizerPaymentDisplayLabel(paymentStatus);
  const variant = isPaidForOrganizerDisplay(paymentStatus) ? "default" : "outline";
  return <StatusBadge variant={variant} label={label} />;
}
