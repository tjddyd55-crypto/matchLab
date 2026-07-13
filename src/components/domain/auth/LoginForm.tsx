"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithPasswordAction } from "@/features/auth/actions";
import type { ActionResult } from "@/lib/action-result";
import { Button } from "@/components/ui/button";
import { authFieldInputClass } from "@/lib/ui/auth-ui";

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
      <p className="text-xs leading-relaxed text-matchon-text-secondary">
        관리자, 주최자, 체육관, 선수 모두 발급받은 아이디로 로그인합니다.
      </p>
      <div className="space-y-2">
        <label htmlFor="login-identifier" className="text-sm font-medium">
          아이디
        </label>
        <input
          id="login-identifier"
          name="identifier"
          type="text"
          autoComplete="username"
          required
          disabled={pending}
          placeholder="아이디를 입력하세요"
          className={authFieldInputClass}
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
          className={authFieldInputClass}
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

      <p className="text-center text-xs text-matchon-text-secondary">
        계정이 없으신가요?{" "}
        <Link
          href="/register"
          className="font-medium text-matchon-primary underline-offset-2 hover:underline"
        >
          안내 보기
        </Link>
      </p>
    </form>
  );
}
