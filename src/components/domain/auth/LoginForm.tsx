"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithPasswordAction } from "@/features/auth/actions";
import type { ActionResult } from "@/lib/action-result";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SignInState = ActionResult<{ redirectTo: string }> | null;

export function LoginForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    signInWithPasswordAction,
    null as SignInState,
  );

  useEffect(() => {
    if (state?.ok === true && state.data.redirectTo) {
      router.push(state.data.redirectTo);
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="login-email" className="text-sm font-medium">
          이메일
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={pending}
          className={cn(
            "border-input bg-background ring-offset-background placeholder:text-muted-foreground",
            "focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs transition-colors",
            "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="login-password" className="text-sm font-medium">
          비밀번호
        </label>
        <input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={pending}
          className={cn(
            "border-input bg-background ring-offset-background placeholder:text-muted-foreground",
            "focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs transition-colors",
            "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        />
      </div>

      {state?.ok === false ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error.message}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "로그인 중…" : "로그인"}
      </Button>

      <p className="text-muted-foreground text-center text-xs">
        계정이 없으신가요?{" "}
        <Link href="/register" className="text-primary underline-offset-2 hover:underline">
          안내 보기
        </Link>
      </p>
    </form>
  );
}
