"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { DesktopSupportInquiryModal } from "@/components/domain/desktop/DesktopSupportInquiryModal";
import {
  requestPasswordResetPhoneCodeAction,
  resetPasswordWithVerifiedPhoneAction,
  verifyPasswordResetPhoneCodeAction,
} from "@/features/phone-verification/actions";
import {
  authLoginErrorClass,
  authLoginFieldStackClass,
  authLoginFormClass,
  authLoginInputClass,
  authLoginLabelClass,
  authLoginSecondaryNoteClass,
} from "@/lib/ui/auth-login-ui";
import { cn } from "@/lib/utils";

type Step = "request" | "verify" | "password" | "done";

export function PasswordResetPhoneForm() {
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [step, setStep] = useState<Step>("request");
  const [loginId, setLoginId] = useState("");
  const [phone, setPhone] = useState("");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [passwordResetToken, setPasswordResetToken] = useState<string | null>(
    null,
  );
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!resendAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [resendAt]);

  const resendRemainSec = useMemo(() => {
    if (!resendAt) return 0;
    return Math.max(0, Math.ceil((resendAt - now) / 1000));
  }, [resendAt, now]);

  function requestCode() {
    setError(null);
    startTransition(async () => {
      const res = await requestPasswordResetPhoneCodeAction({ loginId, phone });
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      setRequestId(res.data.requestId);
      setResendAt(new Date(res.data.resendAvailableAt).getTime());
      setStep("verify");
      if (res.data.deliveryMode === "mock" || res.data.deliveryMode === "dry_run") {
        setInfo(
          "요청이 접수되었습니다. 개발/검증 모드에서는 실제 SMS가 발송되지 않을 수 있습니다.",
        );
      } else {
        setInfo(
          "입력하신 정보가 일치하면 등록된 휴대폰으로 인증번호를 발송합니다.",
        );
      }
    });
  }

  function verifyCode() {
    if (!requestId) return;
    setError(null);
    startTransition(async () => {
      const res = await verifyPasswordResetPhoneCodeAction({
        requestId,
        loginId,
        phone,
        code,
      });
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      setPasswordResetToken(res.data.passwordResetToken);
      setStep("password");
      setInfo("인증이 완료되었습니다. 새 비밀번호를 설정해 주세요.");
    });
  }

  function resetPassword() {
    if (!passwordResetToken) return;
    setError(null);
    startTransition(async () => {
      const res = await resetPasswordWithVerifiedPhoneAction({
        passwordResetToken,
        newPassword,
        confirmPassword,
      });
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      setStep("done");
    });
  }

  if (step === "done") {
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
      {step === "request" || step === "verify" ? (
        <>
          <div className={authLoginFieldStackClass}>
            <label htmlFor="reset-login-id" className={authLoginLabelClass}>
              로그인 아이디
            </label>
            <input
              id="reset-login-id"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              className={authLoginInputClass}
              autoComplete="username"
              disabled={pending || step === "verify"}
            />
          </div>
          <div className={authLoginFieldStackClass}>
            <label htmlFor="reset-phone" className={authLoginLabelClass}>
              등록된 휴대폰 번호
            </label>
            <input
              id="reset-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={authLoginInputClass}
              inputMode="tel"
              autoComplete="tel"
              disabled={pending || step === "verify"}
              placeholder="010-1234-5678"
            />
          </div>
        </>
      ) : null}

      {step === "request" ? (
        <button
          type="button"
          disabled={pending || !loginId || !phone}
          onClick={requestCode}
          className="w-full rounded-md bg-matchon-primary px-3 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {pending ? "요청 중…" : "인증번호 받기"}
        </button>
      ) : null}

      {step === "verify" ? (
        <>
          <div className={authLoginFieldStackClass}>
            <label htmlFor="reset-code" className={authLoginLabelClass}>
              인증번호
            </label>
            <input
              id="reset-code"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className={authLoginInputClass}
              inputMode="numeric"
              autoComplete="one-time-code"
              disabled={pending}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending || code.length < 4}
              onClick={verifyCode}
              className="rounded-md bg-matchon-primary px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {pending ? "확인 중…" : "인증 확인"}
            </button>
            <button
              type="button"
              disabled={pending || resendRemainSec > 0}
              onClick={requestCode}
              className="rounded-md border border-matchon-border px-3 py-2 text-sm disabled:opacity-50"
            >
              {resendRemainSec > 0
                ? `재발송 ${resendRemainSec}s`
                : "인증번호 재발송"}
            </button>
          </div>
        </>
      ) : null}

      {step === "password" ? (
        <>
          <div className={authLoginFieldStackClass}>
            <label htmlFor="new-password" className={authLoginLabelClass}>
              새 비밀번호
            </label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={authLoginInputClass}
              autoComplete="new-password"
              disabled={pending}
            />
          </div>
          <div className={authLoginFieldStackClass}>
            <label htmlFor="confirm-password" className={authLoginLabelClass}>
              새 비밀번호 확인
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={authLoginInputClass}
              autoComplete="new-password"
              disabled={pending}
            />
          </div>
          <p className={authLoginSecondaryNoteClass}>
            비밀번호는 8자 이상이며 공백을 사용할 수 없습니다.
          </p>
          <button
            type="button"
            disabled={pending || !newPassword || !confirmPassword}
            onClick={resetPassword}
            className="w-full rounded-md bg-matchon-primary px-3 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {pending ? "변경 중…" : "비밀번호 재설정"}
          </button>
        </>
      ) : null}

      {info ? (
        <p className={authLoginSecondaryNoteClass} role="status">
          {info}
        </p>
      ) : null}
      {error ? (
        <p className={authLoginErrorClass} role="alert">
          {error}
        </p>
      ) : null}

      <div className={cn(authLoginSecondaryNoteClass, "space-y-2 pt-2")}>
        <p>
          등록된 휴대폰 번호를 사용할 수 없나요?{" "}
          <button
            type="button"
            className="font-semibold text-matchon-primary underline-offset-2 hover:underline"
            onClick={() => setInquiryOpen(true)}
          >
            관리자에게 문의
          </button>
        </p>
        <p>
          <Link
            href="/login"
            className="font-semibold text-matchon-primary underline-offset-2 hover:underline"
          >
            로그인으로 돌아가기
          </Link>
        </p>
      </div>
      <DesktopSupportInquiryModal
        open={inquiryOpen}
        onOpenChange={setInquiryOpen}
        defaultCategory="password_help"
      />
    </div>
  );
}
