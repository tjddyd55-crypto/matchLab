import type { PaymentStatus } from "@/generated/prisma";
import { Button } from "@/components/ui/button";
import {
  confirmBankPaymentFormAction,
  markPaymentPendingCheckFormAction,
  markPaymentRefundedFormAction,
  markPaymentWaivedFormAction,
} from "@/features/payments/actions";

export function PaymentStatusControl({
  paymentId,
  paymentStatus,
}: {
  paymentId: string;
  paymentStatus: PaymentStatus;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {(paymentStatus === "unpaid" || paymentStatus === "pending_check") ? (
        <form action={confirmBankPaymentFormAction}>
          <input type="hidden" name="paymentId" value={paymentId} />
          <Button type="submit" size="sm" variant="default">
            입금 확인
          </Button>
        </form>
      ) : null}

      {paymentStatus === "unpaid" ? (
        <form action={markPaymentPendingCheckFormAction}>
          <input type="hidden" name="paymentId" value={paymentId} />
          <Button type="submit" size="sm" variant="outline">
            확인 필요
          </Button>
        </form>
      ) : null}

      {paymentStatus === "paid" ? (
        <form action={markPaymentRefundedFormAction}>
          <input type="hidden" name="paymentId" value={paymentId} />
          <Button type="submit" size="sm" variant="outline">
            환불
          </Button>
        </form>
      ) : null}

      {paymentStatus !== "refunded" && paymentStatus !== "waived" ? (
        <form action={markPaymentWaivedFormAction}>
          <input type="hidden" name="paymentId" value={paymentId} />
          <Button type="submit" size="sm" variant="secondary">
            면제
          </Button>
        </form>
      ) : null}
    </div>
  );
}
