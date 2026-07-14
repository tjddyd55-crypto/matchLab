"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { acceptMemberGymOwnerInviteAction } from "@/features/gym-owner-account/actions";

export function MemberGymOwnerInviteAcceptForm({
  token,
  defaultName,
  suggestedLoginId,
}: {
  token: string;
  defaultName: string;
  suggestedLoginId: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-3 rounded-md border border-matchon-border bg-white p-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          setError(null);
          const res = await acceptMemberGymOwnerInviteAction({
            token,
            loginId: String(fd.get("loginId") || ""),
            password: String(fd.get("password") || ""),
          });
          if (!res.ok) {
            setError(res.error.message);
            return;
          }
          router.push("/login");
          router.refresh();
        });
      }}
    >
      <p className="text-xs text-matchon-text-secondary">
        대표자: {defaultName}. 아이디와 비밀번호를 직접 설정합니다.
      </p>
      <label className="block text-xs">
        로그인 아이디
        <input
          name="loginId"
          required
          defaultValue={suggestedLoginId}
          className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-xs">
        비밀번호 (8자 이상)
        <input
          name="password"
          type="password"
          required
          minLength={8}
          className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
        />
      </label>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-matchon-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
      >
        {pending ? "처리 중…" : "계정 활성화"}
      </button>
    </form>
  );
}
