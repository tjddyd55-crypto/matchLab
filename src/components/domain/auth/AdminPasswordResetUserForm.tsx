"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import {
  completeAdminPasswordResetAction,
  exchangeAdminPasswordResetTokenAction,
} from "@/features/admin-password-reset/actions";
import {
  authLoginErrorClass,
  authLoginFieldStackClass,
  authLoginFormClass,
  authLoginInputClass,
  authLoginLabelClass,
  authLoginSecondaryNoteClass,
} from "@/lib/ui/auth-login-ui";
import { cn } from "@/lib/utils";

function statusMessage(status: string): string {
  switch (status) {
    case "expired":
      return "재설정 링크가 만료되었습니다.\n관리자에게 새 링크를 요청해 주세요.";
    case "consumed":
      return "이미 사용된 재설정 링크입니다.\n로그인 화면에서 로그인해 주세요.";
    case "revoked":
      return "취소된 재설정 링크입니다.\n관리자에게 새 링크를 요청해 주세요.";
    default:
      return "사용할 수 없는 링크입니다.";
  }
}

type Bootstrap =
  | { mode: "exchange"; token: string }
  | { mode: "challenge"; loginIdMasked: string; accountTypeLabel: string }
  | { mode: "invalid"; status: string };

export function AdminPasswordResetUserForm({
  bootstrap,
}: {
  bootstrap: Bootstrap;
}) {
  const [phase, setPhase] = useState<
    "exchanging" | "form" | "done" | "invalid"
  >(
    bootstrap.mode === "exchange"
      ? "exchanging"
      : bootstrap.mode === "invalid"
        ? "invalid"
        : "form",
  );
  const [status, setStatus] = useState(
    bootstrap.mode === "invalid" ? bootstrap.status : "invalid",
  );
  const [loginIdMasked, setLoginIdMasked] = useState(
    bootstrap.mode === "challenge" ? bootstrap.loginIdMasked : "",
  );
  const [accountTypeLabel, setAccountTypeLabel] = useState(
    bootstrap.mode === "challenge" ? bootstrap.accountTypeLabel : "",
  );
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (bootstrap.mode !== "exchange") return;
    let cancelled = false;
    startTransition(async () => {
      const res = await exchangeAdminPasswordResetTokenAction({
        token: bootstrap.token,
      });
      if (cancelled) return;
      window.history.replaceState({}, "", "/password-reset/admin-link");
      if (!res.ok) {
        setPhase("invalid");
        setStatus("invalid");
        setError(res.error.message);
        return;
      }
      if (res.data.status !== "valid") {
        setPhase("invalid");
        setStatus(res.data.status);
        return;
      }
      setLoginIdMasked(res.data.loginIdMasked);
      setAccountTypeLabel(res.data.accountTypeLabel);
      setPhase("form");
    });
    return () => {
      cancelled = true;
    };
  }, [bootstrap]);

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await completeAdminPasswordResetAction({
        newPassword,
        confirmPassword,
      });
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      setPhase("done");
    });
  }

  if (phase === "exchanging") {
    return (
      <p className={authLoginSecondaryNoteClass} role="status">
        링크를 확인하는 중입니다…
      </p>
    );
  }

  if (phase === "invalid") {
    return (
      <div className={cn(authLoginFormClass, "space-y-4")}>
        <h2 className="text-lg font-bold text-matchon-text-primary">
          유효하지 않은 링크
        </h2>
        <p className="whitespace-pre-line text-sm text-matchon-text-secondary">
          {statusMessage(status)}
        </p>
        {error ? <p className={authLoginErrorClass}>{error}</p> : null}
        <Link
          href="/login"
          className="font-semibold text-matchon-primary underline-offset-2 hover:underline"
        >
          로그인으로 이동
        </Link>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className={cn(authLoginFormClass, "space-y-4 text-center")}>
        <p className="text-base font-semibold text-matchon-text-primary">
          비밀번호가 변경되었습니다.
        </p>
        <p className={authLoginSecondaryNoteClass}>
          기존 세션은 만료되었습니다. 새 비밀번호로 다시 로그인해 주세요.
        </p>
        <Link
          href="/login"
          className="font-semibold text-matchon-primary underline-offset-2 hover:underline"
        >
          로그인으로 이동
        </Link>
      </div>
    );
  }

  return (
    <div className={authLoginFormClass}>
      <h2 className="text-lg font-bold text-matchon-text-primary">
        새 비밀번호 설정
      </h2>
      {(loginIdMasked || accountTypeLabel) && (
        <p className={authLoginSecondaryNoteClass}>
          {accountTypeLabel ? `계정 유형: ${accountTypeLabel}` : null}
          {accountTypeLabel && loginIdMasked ? " · " : null}
          {loginIdMasked ? `계정: ${loginIdMasked}` : null}
        </p>
      )}
      <div className={authLoginFieldStackClass}>
        <label htmlFor="admin-reset-password" className={authLoginLabelClass}>
          새 비밀번호
        </label>
        <input
          id="admin-reset-password"
          type={showPassword ? "text" : "password"}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className={authLoginInputClass}
          autoComplete="new-password"
          disabled={pending}
        />
      </div>
      <div className={authLoginFieldStackClass}>
        <label
          htmlFor="admin-reset-password-confirm"
          className={authLoginLabelClass}
        >
          새 비밀번호 확인
        </label>
        <input
          id="admin-reset-password-confirm"
          type={showPassword ? "text" : "password"}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={authLoginInputClass}
          autoComplete="new-password"
          disabled={pending}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-matchon-text-secondary">
        <input
          type="checkbox"
          checked={showPassword}
          onChange={(e) => setShowPassword(e.target.checked)}
        />
        비밀번호 표시
      </label>
      <p className={authLoginSecondaryNoteClass}>
        비밀번호는 8자 이상이며 공백을 사용할 수 없습니다.
      </p>
      {error ? (
        <p className={authLoginErrorClass} role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        disabled={pending || !newPassword || !confirmPassword}
        onClick={submit}
        className="w-full rounded-md bg-matchon-primary px-3 py-2.5 text-sm font-bold text-white disabled:opacity-50"
      >
        {pending ? "변경 중…" : "비밀번호 변경"}
      </button>
      <p className={authLoginSecondaryNoteClass}>
        <Link
          href="/login"
          className="font-semibold text-matchon-primary underline-offset-2 hover:underline"
        >
          로그인으로 돌아가기
        </Link>
      </p>
    </div>
  );
}
