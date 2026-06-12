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
  compact,
}: {
  paymentId: string | null;
  paymentStatus: PaymentStatus;
  /** 테이블 등 좁은 영역 — 짧은 문구·title 툴팁 */
  compact?: boolean;
}) {
  if (!paymentId) {
    return (
      <span
        className="text-muted-foreground text-xs"
        title="결제 행이 없어 입금 확인을 할 수 없습니다."
      >
        {compact ? "결제 행 없음" : "결제 행이 없어 입금 확인을 할 수 없습니다."}
      </span>
    );
  }

  const btnClass = compact ? "h-7 px-2 text-xs" : undefined;

  return (
    <div className={compact ? "flex flex-wrap justify-end gap-0.5" : "flex flex-wrap gap-1"}>
      {(paymentStatus === "unpaid" || paymentStatus === "pending_check") ? (
        <form action={confirmBankPaymentFormAction}>
          <input type="hidden" name="paymentId" value={paymentId} />
          <Button type="submit" size="sm" variant="default" className={btnClass}>
            입금 확인
          </Button>
        </form>
      ) : null}

      {paymentStatus === "unpaid" ? (
        <form action={markPaymentPendingCheckFormAction}>
          <input type="hidden" name="paymentId" value={paymentId} />
          <Button type="submit" size="sm" variant="outline" className={btnClass}>
            확인 필요
          </Button>
        </form>
      ) : null}

      {paymentStatus === "paid" ? (
        <form action={markPaymentRefundedFormAction}>
          <input type="hidden" name="paymentId" value={paymentId} />
          <Button type="submit" size="sm" variant="outline" className={btnClass}>
            환불
          </Button>
        </form>
      ) : null}

      {paymentStatus !== "refunded" && paymentStatus !== "waived" ? (
        <form action={markPaymentWaivedFormAction}>
          <input type="hidden" name="paymentId" value={paymentId} />
          <Button type="submit" size="sm" variant="secondary" className={btnClass}>
            면제
          </Button>
        </form>
      ) : null}
    </div>
  );
}
