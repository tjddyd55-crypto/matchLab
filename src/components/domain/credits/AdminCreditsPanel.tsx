"use client";

import { useActionState } from "react";
import { adminManualChargeAction } from "@/features/credits/actions";
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { eventListFieldInputClass, eventListFieldSelectClass } from "@/lib/ui/event-list-ui";
import { matchonGridGapClass } from "@/lib/ui/admin-ui";
import { cn } from "@/lib/utils";

type OrganizerOption = {
  id: string;
  name: string;
  balance: number;
};

export function AdminCreditsPanel({
  organizers,
  initialOrganizerId,
}: {
  organizers: OrganizerOption[];
  initialOrganizerId?: string;
}) {
  const [state, formAction, pending] = useActionState(
    adminManualChargeAction,
    null,
  );
  const preselected =
    initialOrganizerId &&
    organizers.some((o) => o.id === initialOrganizerId)
      ? initialOrganizerId
      : "";

  return (
    <div className={cn("grid lg:grid-cols-2", matchonGridGapClass)}>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">수동 충전</CardTitle>
          <p className="text-muted-foreground text-sm leading-relaxed">
            테스트·보상·오류 보정·프로모션 용도입니다. ledger에 manual_charge로
            기록됩니다.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={formAction} className="space-y-4">
            <label className="block space-y-1 text-sm">
              <span className="font-medium">주최자</span>
              <select
                name="organizerId"
                required
                defaultValue={preselected}
                className={eventListFieldSelectClass}
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
                className={eventListFieldInputClass}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">메모</span>
              <input
                name="memo"
                type="text"
                maxLength={500}
                placeholder="사유 (선택)"
                className={eventListFieldInputClass}
              />
            </label>
            <Button type="submit" size="default" disabled={pending} className="w-full sm:w-auto">
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">주최자 목록</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="max-h-96 divide-y overflow-y-auto text-sm">
            {organizers.map((o) => (
              <li key={o.id} className="flex justify-between gap-3 py-2">
                <span className="min-w-0 break-words">{o.name}</span>
                <span className="shrink-0 tabular-nums font-medium">
                  {o.balance.toLocaleString("ko-KR")}C
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
