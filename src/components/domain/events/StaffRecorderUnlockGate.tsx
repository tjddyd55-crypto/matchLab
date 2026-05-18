"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { unlockStaffRecorderAccessAction } from "@/features/staff-result/actions";
import type { ActionResult } from "@/lib/action-result";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function StaffRecorderUnlockGate({
  token,
  eventTitle,
}: {
  token: string;
  eventTitle: string;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    unlockStaffRecorderAccessAction,
    null as ActionResult<{ ok: true }> | null,
  );

  useEffect(() => {
    if (state?.ok === true) router.refresh();
  }, [state, router]);

  return (
    <div className="mx-auto flex min-h-[50vh] w-full max-w-md flex-col justify-center gap-6 px-4 py-12">
      <header className="space-y-2 text-center">
        <p className="text-muted-foreground text-xs tracking-wide uppercase">
          결과 입력
        </p>
        <h1 className="font-heading text-xl font-semibold">{eventTitle}</h1>
        <p className="text-muted-foreground text-sm">
          이 링크에는 접속 코드가 설정되어 있습니다. 현장 스태프에게 코드를
          확인한 뒤 입력해 주세요.
        </p>
      </header>

      <form action={action} className="ring-foreground/10 space-y-4 rounded-xl border bg-card p-5 shadow-sm">
        <input type="hidden" name="token" value={token} />
        {state?.ok === false ? (
          <p className="text-destructive text-sm">{state.error.message}</p>
        ) : null}
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">접속 코드</span>
          <input
            name="accessCode"
            autoComplete="off"
            required
            className={cn(
              "border-input bg-background h-10 w-full rounded-md border px-3 text-sm shadow-sm",
            )}
          />
        </label>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "확인 중…" : "잠금 해제 후 계속"}
        </Button>
      </form>
    </div>
  );
}
