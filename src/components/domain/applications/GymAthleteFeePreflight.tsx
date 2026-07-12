"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { upsertGymEventFeeSettingAction } from "@/features/gym-event-fee/actions";
import type { ActionResult } from "@/lib/action-result";
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { publicApplicationFieldInputClass } from "@/lib/ui/public-application-ui";

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
    <Card variant="muted">
      <CardHeader>
        <CardTitle className="text-base">참가비 안내 (체육관)</CardTitle>
        <CardDescription>
          주최자에게 입금할 금액은 선수 1인당{" "}
          <span className="text-foreground font-medium">
            {organizerDepositPerAthlete != null
              ? `${nf.format(organizerDepositPerAthlete)}원`
              : "미설정"}
          </span>
          입니다. 선수에게 안내할 참가비를 저장하면 신청 화면과 선수 계정에 표시됩니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {state?.ok === false ? (
          <FeedbackMessage tone="error" role="alert">
            {state.error.message}
          </FeedbackMessage>
        ) : null}
        <form action={action} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="eventId" value={eventId} />
          <label className="space-y-1.5 text-sm sm:col-span-2">
            <span className="font-medium">선수에게 안내할 참가비 (원)</span>
            <input
              name="athleteFeeAmount"
              type="number"
              min={0}
              required
              defaultValue={initialAthleteFee ?? ""}
              placeholder="예: 50000"
              className={publicApplicationFieldInputClass}
            />
          </label>
          <label className="space-y-1.5 text-sm sm:col-span-2">
            <span className="font-medium">메모 (선택)</span>
            <input
              name="note"
              maxLength={500}
              defaultValue={initialNote ?? ""}
              className={publicApplicationFieldInputClass}
            />
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" size="field" disabled={pending}>
              {pending ? "저장 중…" : "선수 안내 참가비 저장"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
