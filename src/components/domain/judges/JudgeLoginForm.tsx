"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { judgeLoginAction } from "@/features/judge/actions";
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import { Button } from "@/components/ui/button";
import { judgeFieldInputClass } from "@/lib/ui/judge-ui";

export function JudgeLoginForm({
  defaultLoginId = "",
  callbackUrl,
}: {
  defaultLoginId?: string;
  callbackUrl?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="flex w-full max-w-sm flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          const res = await judgeLoginAction(fd);
          if (!res.ok) {
            setError(res.error.message);
            return;
          }
          router.push(res.data.redirectTo);
          router.refresh();
        });
      }}
    >
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground text-xs">심판 ID</span>
        <input
          name="loginId"
          type="text"
          required
          autoComplete="username"
          defaultValue={defaultLoginId}
          className={judgeFieldInputClass}
        />
      </label>
      {callbackUrl ? (
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
      ) : null}
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground text-xs">비밀번호</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className={judgeFieldInputClass}
        />
      </label>
      {error ? (
        <FeedbackMessage tone="error" role="alert">
          {error}
        </FeedbackMessage>
      ) : null}
      <Button type="submit" disabled={pending} size="field" className="w-full">
        {pending ? "로그인 중…" : "로그인"}
      </Button>
    </form>
  );
}
