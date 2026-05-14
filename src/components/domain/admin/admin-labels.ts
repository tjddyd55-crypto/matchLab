import type { ApplicationStatus, PaymentStatus } from "@/lib/enums";

export function applicationStatusKo(s: ApplicationStatus): string {
  switch (s) {
    case "pending":
      return "대기";
    case "approved":
      return "승인";
    case "rejected":
      return "반려";
    case "cancelled":
      return "취소";
    default:
      return s;
  }
}

export function paymentStatusKo(s: PaymentStatus): string {
  switch (s) {
    case "unpaid":
      return "미입금";
    case "pending_check":
      return "확인중";
    case "paid":
      return "입금완료";
    case "refunded":
      return "환불";
    case "waived":
      return "면제";
    default:
      return s;
  }
}
