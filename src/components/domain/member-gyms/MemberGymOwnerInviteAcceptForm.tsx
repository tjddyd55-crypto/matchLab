"use client";

import { useRef, useState } from "react";
import { acceptMemberGymOwnerInviteAction } from "@/features/gym-owner-account/actions";
import { formatPhoneDisplay } from "@/lib/phone";

type AcceptStatus = "idle" | "submitting" | "success" | "error";

export function MemberGymOwnerInviteAcceptForm({
  token,
  defaultName,
  inviteEmail,
  invitePhone,
  suggestedLoginId,
}: {
  token: string;
  defaultName: string;
  inviteEmail: string;
  invitePhone?: string | null;
  suggestedLoginId: string;
}) {
  const submittingRef = useRef(false);
  const [status, setStatus] = useState<AcceptStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-3 rounded-md border border-matchon-border bg-white p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (submittingRef.current || status === "submitting") return;
        const fd = new FormData(e.currentTarget);
        const loginId = String(fd.get("loginId") || "");
        const password = String(fd.get("password") || "");
        submittingRef.current = true;
        setStatus("submitting");
        setError(null);
        void (async () => {
          try {
            const res = await acceptMemberGymOwnerInviteAction({
              token,
              loginId,
              password,
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
          } catch (err) {
            setError(
              err instanceof Error
                ? err.message
                : "계정 활성화 중 오류가 발생했습니다. 다시 시도해 주세요.",
            );
            setStatus("error");
            submittingRef.current = false;
          }
        })();
      }}
    >
      <p className="text-xs text-matchon-text-secondary">
        대상: {defaultName}
        {inviteEmail ? ` · ${inviteEmail}` : ""}
        {invitePhone ? ` · ${formatPhoneDisplay(invitePhone, "")}` : ""}
      </p>
      <p className="text-xs text-matchon-text-secondary">
        아이디와 비밀번호를 직접 설정합니다. 활성화 후 로그인해 주세요.
      </p>
      <label className="block text-xs">
        로그인 아이디
        <input
          name="loginId"
          required
          defaultValue={suggestedLoginId}
          disabled={status === "submitting" || status === "success"}
          className="mt-1 w-full rounded-md border px-3 py-2 text-sm disabled:opacity-60"
        />
      </label>
      <label className="block text-xs">
        비밀번호 (8자 이상)
        <input
          name="password"
          type="password"
          required
          minLength={8}
          disabled={status === "submitting" || status === "success"}
          className="mt-1 w-full rounded-md border px-3 py-2 text-sm disabled:opacity-60"
        />
      </label>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {status === "success" ? (
        <p className="text-sm text-matchon-primary">
          계정이 활성화되었습니다. 로그인 화면으로 이동합니다…
        </p>
      ) : null}
      <button
        type="submit"
        disabled={status === "submitting" || status === "success"}
        className="w-full rounded-md bg-matchon-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
      >
        {status === "submitting"
          ? "처리 중…"
          : status === "success"
            ? "완료"
            : "계정 활성화"}
      </button>
      {status === "error" ? (
        <button
          type="button"
          className="w-full rounded-md border px-4 py-2 text-sm"
          onClick={() => window.location.reload()}
        >
          페이지 새로고침
        </button>
      ) : null}
    </form>
  );
}
