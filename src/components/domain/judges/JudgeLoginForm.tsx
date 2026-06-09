"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { judgeLoginAction } from "@/features/judge/actions";
import { Button } from "@/components/ui/button";

export function JudgeLoginForm() {
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
          router.push("/judge/matches");
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
          className="border-input bg-background h-10 rounded-md border px-3 text-sm"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground text-xs">비밀번호</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="border-input bg-background h-10 rounded-md border px-3 text-sm"
        />
      </label>
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "로그인 중…" : "로그인"}
      </Button>
    </form>
  );
}
