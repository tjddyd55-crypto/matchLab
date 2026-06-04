"use client";

import { useActionState } from "react";
import {
  confirmCreditPaymentDevAction,
  createCreditPaymentOrderAction,
} from "@/features/credits/payment-actions";
import { getCreditChargePlans, creditsToKrw } from "@/lib/credits/credit-policy";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LedgerRow = {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  reason: string;
  createdAtIso: string;
};

type PaymentRow = {
  id: string;
  orderId: string;
  amountKrw: number;
  credits: number;
  status: string;
  createdAtIso: string;
};

export function OrganizerCreditsDashboard({
  summary,
  ledgers,
  payments,
  devConfirmAllowed,
}: {
  summary: {
    balance: number;
    balanceKrw: number;
    participantFeeCredits: number;
    approveableCount: number;
  };
  ledgers: LedgerRow[];
  payments: PaymentRow[];
  devConfirmAllowed: boolean;
}) {
  const plans = getCreditChargePlans();
  const [orderState, createOrder, orderPending] = useActionState(
    createCreditPaymentOrderAction,
    null,
  );
  const [confirmState, confirmPay, confirmPending] = useActionState(
    confirmCreditPaymentDevAction,
    null,
  );

  const pendingOrderId =
    orderState?.ok === true ? orderState.data.orderId : null;

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-xl border bg-card p-5">
        <h2 className="text-lg font-semibold">보유 크레딧</h2>
        <p className="mt-2 text-3xl font-bold tabular-nums">
          {summary.balance.toLocaleString("ko-KR")}C
        </p>
        <p className="text-muted-foreground mt-1 text-sm">
          원화 환산 약 {summary.balanceKrw.toLocaleString("ko-KR")}원 (1C ={" "}
          {creditsToKrw(1).toLocaleString("ko-KR")}원)
        </p>
        <p className="text-muted-foreground mt-3 text-sm">
          현재 잔액으로 약 {summary.approveableCount}명의 선수를 승인할 수
          있습니다.
        </p>
        <p className="text-muted-foreground mt-1 text-sm">
          선수 승인 1명당 {summary.participantFeeCredits}C가 차감됩니다.
        </p>
      </section>

      <section className="rounded-xl border bg-card p-5">
        <h2 className="text-lg font-semibold">충전 상품</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          실제 PG(토스페이먼츠 등) 연동 전에는 주문 생성 후 시연용 결제 확인만
          가능합니다. 운영 환경에서는 관리자 문의 또는 PG 연동 후 이용해
          주세요.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {plans.map((plan) => (
            <form key={plan.id} action={createOrder} className="rounded-lg border p-4">
              <input type="hidden" name="planId" value={plan.id} />
              <p className="font-medium">{plan.label}</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {plan.credits.toLocaleString("ko-KR")}C
              </p>
              <Button
                type="submit"
                size="sm"
                className="mt-3 w-full"
                disabled={orderPending}
              >
                결제 주문 생성
              </Button>
            </form>
          ))}
        </div>
        {orderState?.ok === false ? (
          <p className="text-destructive mt-3 text-sm" role="alert">
            {orderState.error.message}
          </p>
        ) : null}
        {orderState?.ok === true ? (
          <div className="mt-4 rounded-md border bg-muted/30 p-3 text-sm">
            <p>
              주문 생성됨 — {orderState.data.orderId} ·{" "}
              {orderState.data.credits.toLocaleString("ko-KR")}C
            </p>
            {devConfirmAllowed && pendingOrderId ? (
              <form action={confirmPay} className="mt-2 flex flex-wrap gap-2">
                <input
                  type="hidden"
                  name="orderId"
                  value={pendingOrderId}
                />
                <Button type="submit" size="sm" disabled={confirmPending}>
                  시연용 결제 성공 처리
                </Button>
              </form>
            ) : (
              <p className="text-muted-foreground mt-2 text-xs">
                PG 결제창 연동 준비 중입니다.
              </p>
            )}
          </div>
        ) : null}
        {confirmState?.ok === false ? (
          <p className="text-destructive mt-2 text-sm">{confirmState.error.message}</p>
        ) : null}
        {confirmState?.ok === true ? (
          <p className="mt-2 text-sm text-green-700 dark:text-green-400">
            충전 완료 — {confirmState.data.credits.toLocaleString("ko-KR")}C
            반영되었습니다. 페이지를 새로고침해 잔액을 확인하세요.
          </p>
        ) : null}
      </section>

      <section className="rounded-xl border p-5">
        <h2 className="text-lg font-semibold">결제 내역</h2>
        {payments.length === 0 ? (
          <p className="text-muted-foreground mt-2 text-sm">결제 내역이 없습니다.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b text-xs text-muted-foreground">
                <tr>
                  <th className="py-2 pr-2">주문</th>
                  <th className="py-2 pr-2">금액</th>
                  <th className="py-2 pr-2">크레딧</th>
                  <th className="py-2">상태</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="py-2 font-mono text-xs">{p.orderId}</td>
                    <td className="py-2">{p.amountKrw.toLocaleString("ko-KR")}원</td>
                    <td className="py-2">{p.credits.toLocaleString("ko-KR")}C</td>
                    <td className="py-2">{p.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border p-5">
        <h2 className="text-lg font-semibold">크레딧 거래 내역</h2>
        {ledgers.length === 0 ? (
          <p className="text-muted-foreground mt-2 text-sm">거래 내역이 없습니다.</p>
        ) : (
          <ul className="mt-3 divide-y text-sm">
            {ledgers.map((l) => (
              <li key={l.id} className="flex flex-wrap justify-between gap-2 py-2">
                <div>
                  <p className="font-medium">{l.reason}</p>
                  <p className="text-muted-foreground text-xs">{l.type}</p>
                </div>
                <div className="text-right tabular-nums">
                  <p className={cn(l.amount >= 0 ? "text-green-700" : "text-destructive")}>
                    {l.amount >= 0 ? "+" : ""}
                    {l.amount.toLocaleString("ko-KR")}C
                  </p>
                  <p className="text-muted-foreground text-xs">
                    잔액 {l.balanceAfter.toLocaleString("ko-KR")}C
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
