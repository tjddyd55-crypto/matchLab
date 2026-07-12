import type {
  ApplicationCancellationSource,
  ApplicationStatus,
  PaymentStatus,
} from "@/generated/prisma";
import {
  resolveOrganizerApplicationDisplayStatus,
  isPaidForOrganizerDisplay,
  type OrganizerApplicationDisplayStatus,
} from "@/lib/application-display-status";
import type { MatchonStatus } from "@/lib/ui/matchon-status";

/** 신청 승인 표시 → MatchonStatusBadge */
export function resolveApplicationDisplayMatchonStatus(input: {
  status: ApplicationStatus;
  cancellationSource: ApplicationCancellationSource | null;
}): MatchonStatus {
  const display = resolveOrganizerApplicationDisplayStatus(input);
  return resolveOrganizerDisplayStatusToMatchon(display);
}

export function resolveOrganizerDisplayStatusToMatchon(
  display: OrganizerApplicationDisplayStatus,
): MatchonStatus {
  switch (display) {
    case "approved":
      return "approved";
    case "pending":
      return "unapproved";
    case "gym_cancelled":
    case "organizer_cancelled":
      return "cancelled";
    default:
      return "unapproved";
  }
}

/** 입금 표시 → MatchonStatusBadge */
export function resolvePaymentDisplayMatchonStatus(
  paymentStatus: PaymentStatus,
): MatchonStatus {
  return isPaidForOrganizerDisplay(paymentStatus) ? "paid" : "unpaid";
}

/** 동의 상태 filterKey → MatchonStatusBadge */
export function resolveConsentFilterMatchonStatus(
  filterKey: string,
): MatchonStatus {
  if (filterKey === "completed" || filterKey === "not_required") {
    return "signature_completed";
  }
  if (filterKey === "missing") {
    return "unapproved";
  }
  return "signature_pending";
}
