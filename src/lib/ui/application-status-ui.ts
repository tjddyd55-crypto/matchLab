import type { StatusBadgeVariant } from "@/lib/ui/status-badge-ui";

export type ApplicationPaymentTone =
  | "paid"
  | "unpaid"
  | "approved"
  | "pending"
  | "cancelled_by_gym"
  | "cancelled_by_organizer";

export type ApplicationStatusUiToken = {
  label: string;
  badgeVariant: StatusBadgeVariant;
};

/** 신청·입금 상태 pill 배지 SSOT */
export const applicationStatusUiTokens: Record<
  ApplicationPaymentTone,
  ApplicationStatusUiToken
> = {
  paid: {
    label: "입금완료",
    badgeVariant: "paymentPaid",
  },
  unpaid: {
    label: "미입금",
    badgeVariant: "paymentUnpaid",
  },
  approved: {
    label: "승인",
    badgeVariant: "applicationApproved",
  },
  pending: {
    label: "미승인",
    badgeVariant: "applicationPending",
  },
  cancelled_by_gym: {
    label: "체육관취소",
    badgeVariant: "applicationCancelled",
  },
  cancelled_by_organizer: {
    label: "주최측취소",
    badgeVariant: "applicationCancelled",
  },
};

const PAYMENT_ALIAS: Record<string, ApplicationPaymentTone> = {
  paid: "paid",
  unpaid: "unpaid",
  approved: "approved",
  pending: "pending",
  cancelled_by_gym: "cancelled_by_gym",
  cancelled_by_organizer: "cancelled_by_organizer",
};

export function resolveApplicationPaymentTone(
  status: string | null | undefined,
): ApplicationPaymentTone {
  if (!status) return "pending";
  const key = status.toLowerCase().trim();
  return PAYMENT_ALIAS[key] ?? "pending";
}

export function getApplicationStatusBadgeVariant(
  status: string,
): StatusBadgeVariant {
  return applicationStatusUiTokens[resolveApplicationPaymentTone(status)]
    .badgeVariant;
}

export function getApplicationStatusLabel(status: string): string {
  return applicationStatusUiTokens[resolveApplicationPaymentTone(status)].label;
}
