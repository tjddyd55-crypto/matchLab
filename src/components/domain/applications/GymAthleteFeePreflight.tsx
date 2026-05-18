"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { upsertGymEventFeeSettingAction } from "@/features/gym-event-fee/actions";
import type { ActionResult } from "@/lib/action-result";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function GymAthleteFeePreflight({
  eventId,
  organizerDepositPerAthlete,
  initialAthleteFee,
  initialNote,
}: {
  eventId: string;
  organizerDepositPerAthlete: number | null;
  initialAthleteFee: number | null;
  initialNote: string | null;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    upsertGymEventFeeSettingAction,
    null as ActionResult<{ ok: true }> | null,
  );

  useEffect(() => {
    if (state?.ok === true) router.refresh();
  }, [state, router]);

  const nf = new Intl.NumberFormat("ko-KR");

  return (
    <div className="ring-foreground/10 space-y-3 rounded-xl border bg-card p-4 shadow-sm">
      <h2 className="text-base font-semibold">참가비 안내 (체육관)</h2>
      <p className="text-muted-foreground text-xs leading-relaxed">
        주최자에게 입금할 금액은 선수 1인당{" "}
        <span className="text-foreground font-medium">
          {organizerDepositPerAthlete != null
            ? `${nf.format(organizerDepositPerAthlete)}원`
            : "미설정"}
        </span>
        입니다. 선수에게 안내할 참가비를 아래에 저장하면 신청 화면과 선수
        계정에 표시됩니다. 미입력 시 체육관 내부 정책에 따라 별도 안내로
        처리합니다.
      </p>
      {state?.ok === false ? (
        <p className="text-destructive text-sm">{state.error.message}</p>
      ) : null}
      <form action={action} className="grid gap-2 sm:grid-cols-2">
        <input type="hidden" name="eventId" value={eventId} />
        <label className="space-y-1 text-sm sm:col-span-2">
          <span className="text-muted-foreground text-xs">
            선수에게 안내할 참가비 (원)
          </span>
          <input
            name="athleteFeeAmount"
            type="number"
            min={0}
            required
            defaultValue={initialAthleteFee ?? ""}
            placeholder="예: 50000"
            className={cn(
              "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-sm",
            )}
          />
        </label>
        <label className="space-y-1 text-sm sm:col-span-2">
          <span className="text-muted-foreground text-xs">메모 (선택)</span>
          <input
            name="note"
            maxLength={500}
            defaultValue={initialNote ?? ""}
            className={cn(
              "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-sm",
            )}
          />
        </label>
        <div className="sm:col-span-2">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "저장 중…" : "선수 안내 참가비 저장"}
          </Button>
        </div>
      </form>
    </div>
  );
}
