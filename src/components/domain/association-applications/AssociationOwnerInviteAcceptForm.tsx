"use client";

import { useRef, useState, useTransition } from "react";
import {
  acceptAssociationOwnerInviteAction,
  checkAssociationOwnerInviteLoginIdAction,
} from "@/features/association-applications/actions";

type AcceptStatus = "idle" | "submitting" | "success" | "error";
type LoginIdCheckStatus =
  | "idle"
  | "checking"
  | "available"
  | "unavailable"
  | "error";

export function AssociationOwnerInviteAcceptForm({
  token,
  associationName,
  contactName,
  contactEmail,
}: {
  token: string;
  associationName: string;
  contactName: string;
  contactEmail: string;
}) {
  const submittingRef = useRef(false);
  const [status, setStatus] = useState<AcceptStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [loginId, setLoginId] = useState("");
  const [loginIdCheck, setLoginIdCheck] =
    useState<LoginIdCheckStatus>("idle");
  const [loginIdMessage, setLoginIdMessage] = useState<string | null>(null);
  const [checkedLoginId, setCheckedLoginId] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [, startTransition] = useTransition();

  const formLocked = status === "submitting" || status === "success";
  const passwordsMatch =
    password.length > 0 &&
    passwordConfirm.length > 0 &&
    password === passwordConfirm;
  const loginIdReady =
    loginIdCheck === "available" &&
    checkedLoginId !== null &&
    checkedLoginId === loginId.trim().toLowerCase();
  const canSubmit =
    !formLocked && loginIdReady && password.length >= 8 && passwordsMatch;

  async function runDuplicateCheck() {
    setLoginIdCheck("checking");
    const res = await checkAssociationOwnerInviteLoginIdAction(loginId);
    if (!res.ok) {
      setLoginIdCheck("error");
      setLoginIdMessage(res.error.message);
      setCheckedLoginId(null);
      return;
    }
    setLoginIdCheck(res.data.available ? "available" : "unavailable");
    setLoginIdMessage(res.data.message ?? null);
    setCheckedLoginId(res.data.available ? res.data.loginId : null);
  }

  return (
    <form
      className="mx-auto flex w-full max-w-md flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit || submittingRef.current) return;
        submittingRef.current = true;
        setStatus("submitting");
        setError(null);
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          const res = await acceptAssociationOwnerInviteAction(fd);
          submittingRef.current = false;
          if (!res.ok) {
            setStatus("error");
            setError(res.error.message);
            return;
          }
          setStatus("success");
          window.location.assign(
            `/login?activated=1&loginId=${encodeURIComponent(res.data.loginId)}`,
          );
        });
      }}
    >
      <div className="rounded-xl border border-matchon-border bg-white p-4 text-sm">
        <p className="font-semibold text-matchon-text-primary">{associationName}</p>
        <p className="mt-1 text-matchon-text-secondary">
          담당자 {contactName} · {contactEmail}
        </p>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        로그인 아이디
        <div className="flex gap-2">
          <input
            name="loginId"
            value={loginId}
            disabled={formLocked}
            onChange={(e) => {
              setLoginId(e.target.value);
              setLoginIdCheck("idle");
              setCheckedLoginId(null);
            }}
            className="h-11 flex-1 rounded-lg border px-3"
            autoComplete="username"
            required
          />
          <button
            type="button"
            disabled={formLocked || loginIdCheck === "checking"}
            onClick={() => void runDuplicateCheck()}
            className="rounded-lg border px-3 text-sm font-semibold"
          >
            중복확인
          </button>
        </div>
        {loginIdMessage ? (
          <span
            className={
              loginIdCheck === "available"
                ? "text-emerald-600"
                : "text-destructive"
            }
          >
            {loginIdMessage}
          </span>
        ) : null}
      </label>

      <input type="hidden" name="token" value={token} />

      <label className="flex flex-col gap-1 text-sm">
        비밀번호
        <input
          name="password"
          type="password"
          value={password}
          disabled={formLocked}
          onChange={(e) => setPassword(e.target.value)}
          className="h-11 rounded-lg border px-3"
          autoComplete="new-password"
          required
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        비밀번호 확인
        <input
          name="passwordConfirm"
          type="password"
          value={passwordConfirm}
          disabled={formLocked}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          className="h-11 rounded-lg border px-3"
          autoComplete="new-password"
          required
        />
      </label>

      {error ? (
        <p className="whitespace-pre-wrap text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={!canSubmit}
        className="h-11 rounded-lg bg-matchon-primary text-sm font-bold text-white disabled:opacity-50"
      >
        {status === "submitting" ? "활성화 중…" : "계정 활성화"}
      </button>
    </form>
  );
}
