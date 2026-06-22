import type { MatchStatusBadgeVariant } from "@/lib/ui/match-status-ui";

export type ApplicationPaymentTone =
  | "paid"
  | "unpaid"
  | "approved"
  | "pending"
  | "cancelled_by_gym"
  | "cancelled_by_organizer";

export type ApplicationStatusUiToken = {
  label: string;
  badgeVariant: MatchStatusBadgeVariant;
};

/** 신청·입금 상태 배지 SSOT */
export const applicationStatusUiTokens: Record<
  ApplicationPaymentTone,
  ApplicationStatusUiToken
> = {
  paid: {
    label: "입금완료",
    badgeVariant: "matchOngoing",
  },
  unpaid: {
    label: "미입금",
    badgeVariant: "matchReady",
  },
  approved: {
    label: "승인",
    badgeVariant: "matchFinished",
  },
  pending: {
    label: "미승인",
    badgeVariant: "matchWaiting",
  },
  cancelled_by_gym: {
    label: "체육관취소",
    badgeVariant: "matchCancelled",
  },
  cancelled_by_organizer: {
    label: "주최측취소",
    badgeVariant: "matchCancelled",
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
): MatchStatusBadgeVariant {
  return applicationStatusUiTokens[resolveApplicationPaymentTone(status)]
    .badgeVariant;
}
