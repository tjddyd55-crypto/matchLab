"use client";

import { AuthLoginForm } from "@/components/domain/auth/AuthLoginForm";
import { judgeLoginAction } from "@/features/judge/actions";

/**
 * 심판 로그인 — AuthLoginForm SSOT + judge auth action (분리 유지).
 */
export function JudgeLoginForm({
  defaultLoginId = "",
  callbackUrl,
}: {
  defaultLoginId?: string;
  callbackUrl?: string;
}) {
  return (
    <AuthLoginForm
      identifierName="loginId"
      identifierLabel="심판 ID"
      defaultIdentifier={defaultLoginId}
      action={judgeLoginAction}
      hiddenFields={callbackUrl ? { callbackUrl } : undefined}
    />
  );
}
