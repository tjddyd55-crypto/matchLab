"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { changeFighterPasswordAction } from "@/features/auth/change-password-actions";
import { Button } from "@/components/ui/button";

export function ChangePasswordForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    changeFighterPasswordAction,
    null,
  );

  useEffect(() => {
    if (state?.ok === true) {
      router.push(state.data.redirectTo);
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-4">
      <label className="block space-y-1 text-sm">
        <span className="font-medium">현재 비밀번호</span>
        <input
          name="currentPassword"
          type="password"
          required
          className="border-input h-9 w-full rounded-md border px-3 text-sm"
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">새 비밀번호</span>
        <input
          name="newPassword"
          type="password"
          required
          minLength={6}
          className="border-input h-9 w-full rounded-md border px-3 text-sm"
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">새 비밀번호 확인</span>
        <input
          name="newPasswordConfirm"
          type="password"
          required
          minLength={6}
          className="border-input h-9 w-full rounded-md border px-3 text-sm"
        />
      </label>
      {state?.ok === false ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error.message}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "저장 중…" : "비밀번호 변경"}
      </Button>
    </form>
  );
}
