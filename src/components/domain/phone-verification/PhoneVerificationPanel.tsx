"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  requestSignupPhoneCodeAction,
  verifySignupPhoneCodeAction,
} from "@/features/phone-verification/actions";
import {
  authLoginErrorClass,
  authLoginFieldStackClass,
  authLoginInputClass,
  authLoginLabelClass,
  authLoginSecondaryNoteClass,
} from "@/lib/ui/auth-login-ui";
import { formatPhoneNumber } from "@/lib/phone";
import { cn } from "@/lib/utils";

type Props = {
  accountType: "association" | "gym";
  phone: string;
  onPhoneChange: (phone: string) => void;
  verificationToken: string | null;
  onVerified: (token: string) => void;
  onReset: () => void;
  disabled?: boolean;
};

/**
 * 회원가입 신청용 휴대폰 인증 UI.
 * Production에서는 인증번호를 화면에 노출하지 않는다.
 */
export function PhoneVerificationPanel({
  accountType,
  phone,
  onPhoneChange,
  verificationToken,
  onVerified,
  onReset,
  disabled,
}: Props) {
  const [requestId, setRequestId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [pending, startTransition] = useTransition();
  const [deliveryMode, setDeliveryMode] = useState<
    "mock" | "dry_run" | "live" | null
  >(null);

  useEffect(() => {
    if (!resendAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [resendAt]);

  const resendRemainSec = useMemo(() => {
    if (!resendAt) return 0;
    return Math.max(0, Math.ceil((resendAt - now) / 1000));
  }, [resendAt, now]);

  function resetVerificationLocal(nextPhone: string) {
    onPhoneChange(nextPhone);
    if (verificationToken) onReset();
    setRequestId(null);
    setCode("");
    setError(null);
    setInfo(null);
    setDeliveryMode(null);
  }

  function requestCode() {
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const res = await requestSignupPhoneCodeAction({ phone, accountType });
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      setRequestId(res.data.requestId);
      setResendAt(new Date(res.data.resendAvailableAt).getTime());
      setDeliveryMode(res.data.deliveryMode);
      if (res.data.deliveryMode === "mock" || res.data.deliveryMode === "dry_run") {
        setInfo(
          "개발/검증 모드입니다. 실제 SMS는 발송되지 않습니다. QA inbox로 인증번호를 확인하세요.",
        );
      } else {
        setInfo("인증번호를 발송했습니다.");
      }
    });
  }

  function verifyCode() {
    if (!requestId) {
      setError("먼저 인증번호를 요청해 주세요.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await verifySignupPhoneCodeAction({
        requestId,
        phone,
        code,
      });
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      onVerified(res.data.signupVerificationToken);
      setInfo("휴대폰 인증이 완료되었습니다.");
    });
  }

  const verified = Boolean(verificationToken);

  return (
    <div className="space-y-3 rounded-lg border border-matchon-border p-3">
      <p className={authLoginLabelClass}>휴대폰 인증 (필수)</p>
      <p className={authLoginSecondaryNoteClass}>
        본인 확인을 위해 휴대폰 인증이 필요합니다. 인증 전 가입 신청을 제출할 수
        없습니다.
      </p>
      <div className={authLoginFieldStackClass}>
        <label htmlFor="phone-verify-input" className={authLoginLabelClass}>
          휴대폰 번호
        </label>
        <input
          id="phone-verify-input"
          name="contactPhoneVerifiedDisplay"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          disabled={disabled || verified || pending}
          onChange={(e) => resetVerificationLocal(e.target.value)}
          placeholder="010-1234-5678"
          className={authLoginInputClass}
        />
        {phone ? (
          <p className={authLoginSecondaryNoteClass}>
            정규화 미리보기: {formatPhoneNumber(phone) || "-"}
          </p>
        ) : null}
      </div>

      {!verified ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={disabled || pending || !phone || resendRemainSec > 0}
            onClick={requestCode}
            className={cn(
              "rounded-md bg-matchon-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-50",
            )}
          >
            {pending
              ? "처리 중…"
              : resendRemainSec > 0
                ? `재발송 ${resendRemainSec}s`
                : requestId
                  ? "인증번호 재발송"
                  : "인증번호 발송"}
          </button>
        </div>
      ) : null}

      {requestId && !verified ? (
        <div
          className={authLoginFieldStackClass}
          data-e2e-request-id={
            deliveryMode === "mock" ? requestId : undefined
          }
        >
          <label htmlFor="phone-verify-code" className={authLoginLabelClass}>
            인증번호
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              id="phone-verify-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              disabled={disabled || pending}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className={cn(authLoginInputClass, "max-w-[10rem]")}
              placeholder="6자리"
            />
            <button
              type="button"
              disabled={disabled || pending || code.length < 4}
              onClick={verifyCode}
              className="rounded-md border border-matchon-border px-3 py-2 text-sm font-semibold disabled:opacity-50"
            >
              인증 확인
            </button>
          </div>
        </div>
      ) : null}

      {verified ? (
        <p className="text-sm font-medium text-emerald-700" role="status">
          인증 완료
        </p>
      ) : null}
      {deliveryMode ? (
        <p className={authLoginSecondaryNoteClass}>발송 모드: {deliveryMode}</p>
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
    </div>
  );
}
