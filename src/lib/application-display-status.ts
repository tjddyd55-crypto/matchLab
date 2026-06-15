import type {
  ApplicationCancellationSource,
  ApplicationStatus,
  PaymentStatus,
} from "@/generated/prisma";

export type OrganizerApplicationDisplayStatus =
  | "pending"
  | "approved"
  | "gym_cancelled"
  | "organizer_cancelled";

export const ORGANIZER_APPLICATION_DISPLAY_STATUS_LABELS: Record<
  OrganizerApplicationDisplayStatus,
  string
> = {
  pending: "미승인",
  approved: "승인",
  gym_cancelled: "체육관취소",
  organizer_cancelled: "주최측취소",
};

export const ORGANIZER_PAYMENT_DISPLAY_LABELS: Record<
  "unpaid" | "paid",
  string
> = {
  unpaid: "미입금",
  paid: "입금완료",
};

export function resolveOrganizerApplicationDisplayStatus(input: {
  status: ApplicationStatus;
  cancellationSource: ApplicationCancellationSource | null;
}): OrganizerApplicationDisplayStatus {
  if (input.status === "approved") return "approved";
  if (input.status === "pending") return "pending";
  if (input.status === "cancelled" && input.cancellationSource === "gym") {
    return "gym_cancelled";
  }
  if (input.status === "rejected" || input.status === "cancelled") {
    return "organizer_cancelled";
  }
  return "pending";
}

export function getOrganizerApplicationDisplayStatusLabel(
  display: OrganizerApplicationDisplayStatus,
): string {
  return ORGANIZER_APPLICATION_DISPLAY_STATUS_LABELS[display];
}

export function getOrganizerPaymentDisplayLabel(
  status: PaymentStatus,
): string {
  if (status === "paid" || status === "waived") return "입금완료";
  return "미입금";
}

export function isPaidForOrganizerDisplay(status: PaymentStatus): boolean {
  return status === "paid" || status === "waived";
}
