"use client";

import { useActionState, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AuthLoginField } from "@/components/domain/auth/AuthLoginField";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";
import {
  authLoginErrorClass,
  authLoginFormClass,
  authLoginSecondaryNoteClass,
} from "@/lib/ui/auth-login-ui";

type RedirectState = ActionResult<{ redirectTo: string }> | null;

type AuthLoginAction = (
  prev: RedirectState,
  formData: FormData,
) => Promise<ActionResult<{ redirectTo: string }>>;

export type AuthLoginFormProps = {
  /** FormData 키 — 일반 `identifier`, 심판 `loginId` */
  identifierName: "identifier" | "loginId";
  identifierLabel: string;
  passwordLabel?: string;
  submitLabel?: string;
  pendingLabel?: string;
  defaultIdentifier?: string;
  identifierPlaceholder?: string;
  identifierAutoComplete?: string;
  passwordAutoComplete?: string;
  /** 서버 action (일반 auth / judge auth 분리 유지) */
  action: AuthLoginAction;
  banner?: ReactNode;
  secondaryNote?: ReactNode;
  footer?: ReactNode;
  hiddenFields?: Record<string, string>;
  onIdentifierChange?: (value: string) => void;
};

/**
 * 로그인 폼 SSOT. action만 variant별로 주입하고 마크업·타이포는 공유한다.
 */
export function AuthLoginForm({
  identifierName,
  identifierLabel,
  passwordLabel = "비밀번호",
  submitLabel = "로그인",
  pendingLabel = "로그인 중…",
  defaultIdentifier,
  identifierPlaceholder,
  identifierAutoComplete = "username",
  passwordAutoComplete = "current-password",
  action,
  banner,
  secondaryNote,
  footer,
  hiddenFields,
  onIdentifierChange,
}: AuthLoginFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, null as RedirectState);

  useEffect(() => {
    if (state?.ok === true && state.data.redirectTo) {
      router.push(state.data.redirectTo);
      router.refresh();
    }
  }, [state, router]);

  const identifierId = `login-${identifierName}`;
  const passwordId = "login-password";

  return (
    <form
      action={formAction}
      className={authLoginFormClass}
      aria-busy={pending || undefined}
    >
      {banner}
      {secondaryNote ? (
        <p className={authLoginSecondaryNoteClass}>{secondaryNote}</p>
      ) : null}

      <AuthLoginField
        id={identifierId}
        name={identifierName}
        label={identifierLabel}
        autoComplete={identifierAutoComplete}
        defaultValue={defaultIdentifier ?? ""}
        placeholder={identifierPlaceholder}
        disabled={pending}
        onValueChange={onIdentifierChange}
      />

      {hiddenFields
        ? Object.entries(hiddenFields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))
        : null}

      <AuthLoginField
        id={passwordId}
        name="password"
        label={passwordLabel}
        type="password"
        autoComplete={passwordAutoComplete}
        disabled={pending}
      />

      {state?.ok === false ? (
        <p className={authLoginErrorClass} role="alert" aria-live="assertive">
          {state.error.message}
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        className="w-full font-bold"
        disabled={pending}
      >
        {pending ? pendingLabel : submitLabel}
      </Button>

      {footer}
    </form>
  );
}
