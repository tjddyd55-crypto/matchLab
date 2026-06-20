"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { upsertEventPaymentSettingAction } from "@/features/events/actions";
import type { ActionResult } from "@/lib/action-result";
import type { OrganizerEventDetailVM } from "@/lib/services/event.service";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 16);
}

function hasPaymentConfigured(
  initial: OrganizerEventDetailVM["paymentSetting"],
): boolean {
  return Boolean(
    initial?.bankName?.trim() &&
      initial?.accountNumber?.trim() &&
      initial?.accountHolder?.trim(),
  );
}

export function EventPaymentSettingForm({
  eventId,
  initial,
}: {
  eventId: string;
  initial: OrganizerEventDetailVM["paymentSetting"];
}) {
  const router = useRouter();
  const [feeEnabled, setFeeEnabled] = useState(() => hasPaymentConfigured(initial));
  const [state, action, pending] = useActionState(
    upsertEventPaymentSettingAction,
    null as ActionResult<{ ok: true }> | null,
  );

  useEffect(() => {
    if (state?.ok === true) router.refresh();
  }, [state, router]);

  return (
    <div
      id="setup-payment"
      className="ring-foreground/10 scroll-mt-24 space-y-4 rounded-xl border bg-card p-4 shadow-sm md:p-6"
    >
      <h2 className="text-lg font-semibold">참가비·입금 계좌 (주최자 ↔ 체육관)</h2>
      <p className="text-muted-foreground text-sm">
        참가비를 받지 않는 대회는 <strong className="text-foreground">없음</strong>
        으로 두세요. 참가비가 있는 경우에만 체육관 입금 안내가 표시됩니다.
      </p>
      {state?.ok === false ? (
        <p className="text-destructive text-sm">{state.error.message}</p>
      ) : null}
      <form action={action} className="grid gap-4">
        <input type="hidden" name="eventId" value={eventId} />
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">참가비 사용 여부</legend>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="feeEnabledChoice"
                checked={!feeEnabled}
                onChange={() => setFeeEnabled(false)}
              />
              없음
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="feeEnabledChoice"
                checked={feeEnabled}
                onChange={() => setFeeEnabled(true)}
              />
              있음
            </label>
          </div>
          <input type="hidden" name="feeEnabled" value={feeEnabled ? "true" : "false"} />
        </fieldset>

        {feeEnabled ? (
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">
                체육관 입금 기준 (선수 1인당, 원)
              </span>
              <input
                name="feeAmount"
                type="number"
                min={0}
                required={feeEnabled}
                defaultValue={initial?.feeAmount ?? 0}
                className={cn(
                  "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-sm",
                )}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">입금 기한 (선택)</span>
              <input
                type="datetime-local"
                name="paymentDueDate"
                defaultValue={toDatetimeLocalValue(initial?.paymentDueDate ?? null)}
                className={cn(
                  "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-sm",
                )}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">은행명</span>
              <input
                name="bankName"
                required={feeEnabled}
                maxLength={120}
                defaultValue={initial?.bankName ?? ""}
                className={cn(
                  "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-sm",
                )}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">계좌번호</span>
              <input
                name="accountNumber"
                required={feeEnabled}
                maxLength={80}
                autoComplete="off"
                defaultValue={initial?.accountNumber ?? ""}
                className={cn(
                  "border-input bg-background h-9 w-full rounded-md border px-3 font-mono text-sm shadow-sm",
                )}
              />
            </label>
            <label className="space-y-1 text-sm md:col-span-2">
              <span className="text-muted-foreground">예금주</span>
              <input
                name="accountHolder"
                required={feeEnabled}
                maxLength={120}
                defaultValue={initial?.accountHolder ?? ""}
                className={cn(
                  "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-sm",
                )}
              />
            </label>
            <label className="space-y-1 text-sm md:col-span-2">
              <span className="text-muted-foreground">입금 안내 문구 (선택)</span>
              <textarea
                name="depositorRule"
                rows={2}
                maxLength={500}
                defaultValue={initial?.depositorRule ?? ""}
                placeholder="입금자명 규칙 등 체육관에 전달할 안내"
                className={cn(
                  "border-input bg-background min-h-[56px] w-full rounded-md border px-3 py-2 text-sm shadow-sm",
                )}
              />
            </label>
          </div>
        ) : (
          <p className="text-muted-foreground rounded-md border border-dashed px-3 py-2 text-sm">
            참가비 없음으로 저장하면 입금 계좌 정보가 삭제되며, 체육관 신청
            화면에 입금 안내가 표시되지 않습니다.
          </p>
        )}

        <div>
          <Button type="submit" disabled={pending}>
            {pending ? "저장 중…" : "입금 설정 저장"}
          </Button>
        </div>
      </form>
    </div>
  );
}
