"use client";

import { useActionState } from "react";
import { adminManualChargeAction } from "@/features/credits/actions";
import { Button } from "@/components/ui/button";

type OrganizerOption = {
  id: string;
  name: string;
  balance: number;
};

export function AdminCreditsPanel({
  organizers,
}: {
  organizers: OrganizerOption[];
}) {
  const [state, formAction, pending] = useActionState(
    adminManualChargeAction,
    null,
  );

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section className="rounded-xl border bg-card p-5">
        <h2 className="text-lg font-semibold">수동 충전</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          테스트·보상·오류 보정·프로모션 용도입니다. ledger에 manual_charge로
          기록됩니다.
        </p>
        <form action={formAction} className="mt-4 space-y-4">
          <label className="block space-y-1 text-sm">
            <span className="font-medium">주최자</span>
            <select
              name="organizerId"
              required
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
            >
              <option value="">선택</option>
              {organizers.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} (잔액 {o.balance.toLocaleString("ko-KR")}C)
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">충전 크레딧</span>
            <input
              name="amount"
              type="number"
              min={1}
              required
              placeholder="예: 10000"
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">메모</span>
            <input
              name="memo"
              type="text"
              maxLength={500}
              placeholder="사유 (선택)"
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
            />
          </label>
          <Button type="submit" disabled={pending}>
            충전 실행
          </Button>
        </form>
        {state?.ok === false ? (
          <p className="text-destructive mt-3 text-sm" role="alert">
            {state.error.message}
          </p>
        ) : null}
        {state?.ok === true ? (
          <p className="mt-3 text-sm text-green-700 dark:text-green-400">
            충전 완료 — 거래 후 잔액 {state.data.balanceAfter.toLocaleString("ko-KR")}C
          </p>
        ) : null}
      </section>

      <section className="rounded-xl border p-5">
        <h2 className="text-lg font-semibold">주최자 목록</h2>
        <ul className="mt-3 max-h-96 divide-y overflow-y-auto text-sm">
          {organizers.map((o) => (
            <li key={o.id} className="flex justify-between py-2">
              <span>{o.name}</span>
              <span className="tabular-nums font-medium">
                {o.balance.toLocaleString("ko-KR")}C
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
