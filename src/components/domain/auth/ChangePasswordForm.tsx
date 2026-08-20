"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { changeFighterPasswordAction } from "@/features/auth/change-password-actions";
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import { Button } from "@/components/ui/button";
import { fighterDashboardFieldInputClass } from "@/lib/ui/fighter-dashboard-ui";

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
      <label className="block space-y-1.5 text-sm">
        <span className="font-medium">현재 비밀번호</span>
        <input
          name="currentPassword"
          type="password"
          required
          className={fighterDashboardFieldInputClass}
        />
      </label>
      <label className="block space-y-1.5 text-sm">
        <span className="font-medium">새 비밀번호</span>
        <input
          name="newPassword"
          type="password"
          required
          minLength={6}
          className={fighterDashboardFieldInputClass}
        />
      </label>
      <label className="block space-y-1.5 text-sm">
        <span className="font-medium">새 비밀번호 확인</span>
        <input
          name="newPasswordConfirm"
          type="password"
          required
          minLength={6}
          className={fighterDashboardFieldInputClass}
        />
      </label>
      {state?.ok === false ? (
        <FeedbackMessage tone="error" role="alert">
          {state.error.message}
        </FeedbackMessage>
      ) : null}
      <Button type="submit" size="default" className="w-full" disabled={pending}>
        {pending ? "저장 중…" : "비밀번호 변경"}
      </Button>
    </form>
  );
}
