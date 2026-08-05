"use client";

import { useState, useTransition } from "react";
import {
  authLoginFieldStackClass,
  authLoginInputClass,
  authLoginLabelClass,
  authLoginSecondaryNoteClass,
} from "@/lib/ui/auth-login-ui";

type CheckStatus =
  | "idle"
  | "checking"
  | "available"
  | "unavailable"
  | "error";

export function RequestedLoginIdField({
  name = "requestedLoginId",
  required = true,
  disabled = false,
}: {
  name?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<CheckStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function check() {
    const candidate = value.trim();
    if (!candidate) {
      setStatus("idle");
      setMessage(null);
      return;
    }
    setStatus("checking");
    startTransition(async () => {
      try {
        const res = await fetch("/api/public/join/check-login-id", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ loginId: candidate }),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.data) {
          setStatus("error");
          setMessage(json?.error?.message ?? "중복 확인에 실패했습니다.");
          return;
        }
        setStatus(json.data.available ? "available" : "unavailable");
        setMessage(json.data.message ?? null);
        if (json.data.available && typeof json.data.loginId === "string") {
          setValue(json.data.loginId);
        }
      } catch {
        setStatus("error");
        setMessage("중복 확인에 실패했습니다.");
      }
    });
  }

  return (
    <div className={authLoginFieldStackClass}>
      <label htmlFor={name} className={authLoginLabelClass}>
        희망 로그인 아이디{required ? " *" : ""}
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          id={name}
          name={name}
          value={value}
          onChange={(e) => {
            setValue(e.target.value.toLowerCase());
            setStatus("idle");
            setMessage(null);
          }}
          required={required}
          disabled={disabled || pending}
          autoComplete="username"
          maxLength={20}
          className={`${authLoginInputClass} min-w-0 flex-1`}
          placeholder="영문 소문자·숫자 조합"
        />
        <button
          type="button"
          className="rounded-md border border-matchon-border px-3 py-2 text-sm font-semibold"
          disabled={disabled || pending || !value.trim()}
          onClick={check}
        >
          {status === "checking" ? "확인 중…" : "중복 확인"}
        </button>
      </div>
      <p className={authLoginSecondaryNoteClass}>
        승인 후 로그인에 사용할 아이디입니다. 영문 소문자와 숫자를 조합해
        입력해 주세요.
      </p>
      {message ? (
        <p
          className={
            status === "available"
              ? "text-sm text-emerald-700"
              : "text-sm text-destructive"
          }
          role="status"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
