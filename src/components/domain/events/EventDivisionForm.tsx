"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createEventDivisionAction } from "@/features/events/actions";
import type { ActionResult } from "@/lib/action-result";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EventDivisionForm({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    createEventDivisionAction,
    null as ActionResult<{ divisionId: string }> | null,
  );

  useEffect(() => {
    if (state?.ok === true) router.refresh();
  }, [state, router]);

  return (
    <form action={action} className="grid gap-3 rounded-lg border bg-muted/20 p-3 md:grid-cols-2">
      <input type="hidden" name="eventId" value={eventId} />
      <h3 className="text-sm font-semibold md:col-span-2">경기구분 추가</h3>
      {state?.ok === false ? (
        <p className="text-destructive text-sm md:col-span-2">{state.error.message}</p>
      ) : null}
      <label className="space-y-1 text-sm md:col-span-2">
        <span className="text-muted-foreground">종목·경기구분명</span>
        <input
          name="sportType"
          required
          maxLength={120}
          className={cn(
            "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-sm",
          )}
          placeholder="예: 킥복싱 라이트급"
        />
      </label>
      <label className="space-y-1 text-sm">
        <span className="text-muted-foreground">룰</span>
        <input
          name="ruleType"
          maxLength={120}
          className={cn(
            "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-sm",
          )}
        />
      </label>
      <label className="space-y-1 text-sm">
        <span className="text-muted-foreground">성별</span>
        <input
          name="gender"
          maxLength={80}
          className={cn(
            "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-sm",
          )}
        />
      </label>
      <label className="space-y-1 text-sm">
        <span className="text-muted-foreground">연령</span>
        <input
          name="ageGroup"
          maxLength={120}
          className={cn(
            "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-sm",
          )}
        />
      </label>
      <label className="space-y-1 text-sm">
        <span className="text-muted-foreground">체급</span>
        <input
          name="weightClass"
          maxLength={120}
          className={cn(
            "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-sm",
          )}
        />
      </label>
      <label className="space-y-1 text-sm md:col-span-2">
        <span className="text-muted-foreground">실력 구간</span>
        <input
          name="skillLevel"
          maxLength={120}
          className={cn(
            "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-sm",
          )}
        />
      </label>
      <div className="md:col-span-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "추가 중…" : "경기구분 추가"}
        </Button>
      </div>
    </form>
  );
}
