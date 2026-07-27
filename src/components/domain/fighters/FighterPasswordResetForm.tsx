"use client";

import { useRef, useState } from "react";
import { completeFighterPasswordResetAction } from "@/features/fighter-account/actions";
import { Button } from "@/components/ui/button";

type FormStatus = "idle" | "submitting" | "success" | "error";

export function FighterPasswordResetForm({
  token,
  fighterName,
  loginIdMasked,
}: {
  token: string;
  fighterName: string;
  loginIdMasked: string;
}) {
  const submittingRef = useRef(false);
  const [status, setStatus] = useState<FormStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  const formLocked = status === "submitting" || status === "success";
  const passwordsMatch =
    password.length > 0 &&
    passwordConfirm.length > 0 &&
    password === passwordConfirm;
  const passwordMismatch =
    passwordConfirm.length > 0 && password !== passwordConfirm;
  const canSubmit =
    !formLocked && password.length >= 8 && passwordsMatch && !passwordMismatch;

  return (
    <form
      className="space-y-5 overflow-x-hidden rounded-md border border-matchon-border bg-white p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (submittingRef.current || !canSubmit) return;
        if (password !== passwordConfirm) {
          setError("비밀번호가 일치하지 않습니다.");
          setStatus("error");
          return;
        }
        submittingRef.current = true;
        setStatus("submitting");
        setError(null);
        void (async () => {
          try {
            const res = await completeFighterPasswordResetAction({
              token,
              password,
              passwordConfirm,
            });
            if (!res.ok) {
              setError(res.error.message);
              setStatus("error");
              submittingRef.current = false;
              return;
            }
            setStatus("success");
            const q = new URLSearchParams({
              activated: "1",
              loginId: res.data.loginId,
            });
            window.location.assign(`/login?${q.toString()}`);
          } catch {
            setError(
              "비밀번호 재설정 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
            );
            setStatus("error");
            submittingRef.current = false;
          }
        })();
      }}
    >
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-matchon-text-primary">
          계정 확인
        </h2>
        <dl className="space-y-1.5 text-sm text-matchon-text-secondary">
          <div className="flex flex-wrap gap-x-2">
            <dt className="font-medium text-matchon-text-primary">선수명</dt>
            <dd>{fighterName}</dd>
          </div>
          <div className="flex flex-wrap gap-x-2">
            <dt className="font-medium text-matchon-text-primary">아이디</dt>
            <dd className="font-mono">{loginIdMasked}</dd>
          </div>
        </dl>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-matchon-text-primary">
          새 비밀번호
        </h2>
        <p className="text-xs text-matchon-text-secondary">
          8자 이상, 아이디와 동일할 수 없습니다.
        </p>

        <div className="space-y-1.5">
          <label
            htmlFor="fighter-reset-password"
            className="block text-xs font-medium"
          >
            비밀번호
          </label>
          <div className="flex gap-2">
            <input
              id="fighter-reset-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              disabled={formLocked}
              onChange={(e) => setPassword(e.target.value)}
              className="border-input h-11 min-w-0 flex-1 rounded-md border px-3 text-base"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-11 shrink-0"
              disabled={formLocked}
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? "숨기기" : "표시"}
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="fighter-reset-password-confirm"
            className="block text-xs font-medium"
          >
            비밀번호 확인
          </label>
          <div className="flex gap-2">
            <input
              id="fighter-reset-password-confirm"
              type={showPasswordConfirm ? "text" : "password"}
              autoComplete="new-password"
              value={passwordConfirm}
              disabled={formLocked}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              className="border-input h-11 min-w-0 flex-1 rounded-md border px-3 text-base"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-11 shrink-0"
              disabled={formLocked}
              onClick={() => setShowPasswordConfirm((v) => !v)}
            >
              {showPasswordConfirm ? "숨기기" : "표시"}
            </Button>
          </div>
          {passwordMismatch ? (
            <p className="text-xs text-destructive">비밀번호가 일치하지 않습니다.</p>
          ) : null}
        </div>
      </section>

      {error ? (
        <p className="whitespace-pre-line text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" className="w-full font-bold" disabled={!canSubmit}>
        {status === "submitting" ? "처리 중…" : "비밀번호 변경"}
      </Button>
    </form>
  );
}
