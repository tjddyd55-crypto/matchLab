"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useAppConfirmDialog } from "@/components/shared/app-confirm-dialog";
import {
  cancelBillingAtPeriodEndAction,
  preparePaymentMethodChangeAction,
} from "@/features/billing/actions";

async function loadTossSdk() {
  if (window.TossPayments) return;
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://js.tosspayments.com/v2/standard";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Toss SDK 로드 실패"));
    document.head.appendChild(s);
  });
}

export function BillingAccountActions({
  canCancel,
  canChangeMethod,
}: {
  canCancel: boolean;
  canChangeMethod: boolean;
}) {
  const { confirm } = useAppConfirmDialog();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="mt-4 flex flex-col gap-2">
      {canChangeMethod ? (
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const prep = await preparePaymentMethodChangeAction();
              if (!prep.ok) {
                setError(prep.error);
                return;
              }
              try {
                await loadTossSdk();
                if (!window.TossPayments) throw new Error("SDK 없음");
                const toss = window.TossPayments(prep.data.clientKey);
                const payment = toss.payment({
                  customerKey: prep.data.customerKey,
                });
                const origin = window.location.origin;
                await payment.requestBillingAuth({
                  method: "CARD",
                  successUrl: `${origin}/billing/toss/method-success?orderId=${encodeURIComponent(prep.data.orderId)}`,
                  failUrl: `${origin}/billing/toss/fail?orderId=${encodeURIComponent(prep.data.orderId)}`,
                });
              } catch (e) {
                setError(e instanceof Error ? e.message : "실패");
              }
            });
          }}
        >
          결제수단 변경
        </Button>
      ) : null}

      {canCancel ? (
        <Button
          type="button"
          variant="destructive"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const ok = await confirm({
                title: "구독 해지",
                description:
                  "현재 이용 기간이 끝나면 구독이 종료됩니다. 기간 중에는 계속 이용할 수 있습니다.",
                confirmLabel: "기간 말에 해지",
                variant: "danger",
              });
              if (!ok) return;
              const res = await cancelBillingAtPeriodEndAction();
              if (!res.ok) setError(res.error);
              else window.location.reload();
            });
          }}
        >
          구독 해지 (기간 말)
        </Button>
      ) : null}

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
