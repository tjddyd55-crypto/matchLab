"use client";

import { useActionState } from "react";
import Link from "next/link";
import { adminManualChargeAction } from "@/features/credits/actions";
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import { Button } from "@/components/ui/button";
import { eventListFieldInputClass } from "@/lib/ui/event-list-ui";
import type { AdminOrganizationCreditLedgerDTO } from "@/lib/dto/admin";
import { formatAdminDateTime } from "@/components/domain/admin/admin-format";
import { adminMutedTextClass } from "@/lib/ui/admin-ui";

export function AdminOrganizationCreditPanel({
  organizerId,
  organizerName,
  balance,
  ledgers,
}: {
  organizerId: string;
  organizerName: string;
  balance: number;
  ledgers: AdminOrganizationCreditLedgerDTO[];
}) {
  const [state, formAction, pending] = useActionState(
    adminManualChargeAction,
    null,
  );

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-matchon-border bg-matchon-surface/40 p-4">
        <p className={`${adminMutedTextClass} text-sm`}>현재 잔액</p>
        <p className="text-2xl font-semibold tabular-nums">
          {balance.toLocaleString("ko-KR")}C
        </p>
        <p className={`${adminMutedTextClass} mt-1 text-xs`}>
          플랫폼 크레딧은 Organizer wallet 기준입니다. 사용 가능 상태 ·
          manual_charge만 지원합니다.
        </p>
      </div>

      <div className="space-y-3 rounded-lg border border-matchon-border p-4">
        <h3 className="text-sm font-semibold">수동 충전 (manual_charge)</h3>
        <form action={formAction} className="max-w-md space-y-3">
          <input type="hidden" name="organizerId" value={organizerId} />
          <p className="text-sm">
            대상: <span className="font-medium">{organizerName}</span>
          </p>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">충전 크레딧</span>
            <input
              name="amount"
              type="number"
              min={1}
              required
              placeholder="예: 10000"
              className={eventListFieldInputClass}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">사유/메모</span>
            <input
              name="memo"
              type="text"
              maxLength={500}
              placeholder="사유 (선택)"
              className={eventListFieldInputClass}
            />
          </label>
          <Button type="submit" disabled={pending}>
            충전 실행
          </Button>
        </form>
        {state?.ok === false ? (
          <FeedbackMessage tone="error" role="alert">
            {state.error.message}
          </FeedbackMessage>
        ) : null}
        {state?.ok === true ? (
          <FeedbackMessage tone="success">
            충전 완료 — 거래 후 잔액{" "}
            {state.data.balanceAfter.toLocaleString("ko-KR")}C
          </FeedbackMessage>
        ) : null}
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">최근 이력</h3>
          <Link
            href={`/admin/credits?organizerId=${encodeURIComponent(organizerId)}`}
            className="text-xs font-semibold text-matchon-primary underline-offset-2 hover:underline"
          >
            전체 크레딧 관리에서 보기
          </Link>
        </div>
        {ledgers.length === 0 ? (
          <p className={`${adminMutedTextClass} text-sm`}>이력이 없습니다.</p>
        ) : (
          <ul className="divide-y rounded-lg border border-matchon-border text-sm">
            {ledgers.map((l) => (
              <li
                key={l.id}
                className="flex flex-wrap items-start justify-between gap-2 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {l.type} · {l.reason}
                  </p>
                  {l.memo ? (
                    <p className={adminMutedTextClass}>{l.memo}</p>
                  ) : null}
                  <p className={`${adminMutedTextClass} text-xs`}>
                    {formatAdminDateTime(l.createdAt)}
                  </p>
                </div>
                <div className="shrink-0 text-right tabular-nums">
                  <p
                    className={
                      l.amount >= 0 ? "text-emerald-700" : "text-rose-700"
                    }
                  >
                    {l.amount >= 0 ? "+" : ""}
                    {l.amount.toLocaleString("ko-KR")}C
                  </p>
                  <p className={`${adminMutedTextClass} text-xs`}>
                    잔액 {l.balanceAfter.toLocaleString("ko-KR")}C
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
