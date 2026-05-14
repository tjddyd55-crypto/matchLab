import type { PaymentStatus } from "@/generated/prisma";
import { StatusBadge } from "@/components/shared/StatusBadge";

const LABELS: Record<PaymentStatus, string> = {
  unpaid: "미입금",
  pending_check: "확인중",
  paid: "입금완료",
  refunded: "환불",
  waived: "면제",
};

export function PaymentStatusBadge({
  status,
}: {
  status: PaymentStatus;
}) {
  const label = LABELS[status];
  const variant =
    status === "paid"
      ? "default"
      : status === "unpaid"
        ? "destructive"
        : status === "refunded"
          ? "outline"
          : "secondary";
  return <StatusBadge variant={variant} label={label} />;
}
