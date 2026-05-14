import type { PaymentStatus } from "@/lib/enums";
import { StatusBadge } from "@/components/shared/StatusBadge";

const tone: Record<
  PaymentStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  unpaid: "outline",
  pending_check: "secondary",
  paid: "default",
  refunded: "destructive",
  waived: "outline",
};

const labelKo: Record<PaymentStatus, string> = {
  unpaid: "미납",
  pending_check: "확인중",
  paid: "입금완료",
  refunded: "환불",
  waived: "면제",
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <StatusBadge variant={tone[status]} label={labelKo[status]} />
  );
}
