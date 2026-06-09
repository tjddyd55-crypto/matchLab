"use client";

import { useState } from "react";
import {
  provisionGymFighterAccountAction,
  resetGymFighterPasswordAction,
} from "@/features/fighters/actions";
import { Button } from "@/components/ui/button";

export function GymFighterAccountPanel({
  fighterId,
  loginId,
  hasAccount,
}: {
  fighterId: string;
  loginId: string | null;
  hasAccount: boolean;
}) {
  const [issued, setIssued] = useState<{
    loginId: string;
    temporaryPassword: string;
    label: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function run(
    action: typeof provisionGymFighterAccountAction,
    fd: FormData,
  ) {
    setPending(true);
    setError(null);
    const res = await action(null, fd);
    setPending(false);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    setIssued({
      loginId: res.data.loginId,
      temporaryPassword: res.data.temporaryPassword,
      label: hasAccount ? "새 임시 비밀번호" : "로그인 정보",
    });
  }

  if (issued) {
    return (
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm space-y-2">
        <p className="font-medium">{issued.label}</p>
        <p className="text-muted-foreground text-xs">
          기존 비밀번호는 확인할 수 없습니다. 아래 정보를 선수에게 한 번만
          전달하세요.
        </p>
        <p>
          아이디: <span className="font-mono">{issued.loginId}</span>
        </p>
        <p>
          비밀번호:{" "}
          <span className="font-mono">{issued.temporaryPassword}</span>
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-dashed p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">선수 로그인 계정</h3>
        {!hasAccount ? (
          <span className="text-muted-foreground rounded-md border px-2 py-0.5 text-xs font-medium">
            계정 발급 필요
          </span>
        ) : null}
      </div>
      {hasAccount ? (
        <>
          <p className="text-muted-foreground text-xs">
            연결된 아이디: <span className="font-mono">{loginId}</span>
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              fd.set("fighterId", fighterId);
              fd.set("autoGeneratePassword", "true");
              void run(resetGymFighterPasswordAction, fd);
            }}
          >
            <Button type="submit" size="sm" variant="outline" disabled={pending}>
              비밀번호 재발급
            </Button>
          </form>
        </>
      ) : (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            fd.set("fighterId", fighterId);
            fd.set("autoGeneratePassword", "true");
            void run(provisionGymFighterAccountAction, fd);
          }}
        >
          <label className="block space-y-1 text-sm">
            <span>로그인 아이디</span>
            <input name="loginId" required className="border-input h-9 w-full rounded-md border px-2 text-sm" />
          </label>
          <input type="hidden" name="autoGeneratePassword" value="true" />
          <Button type="submit" size="sm" disabled={pending}>
            로그인 계정 발급
          </Button>
        </form>
      )}
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
      <p className="text-muted-foreground text-[10px]">
        SMS 비밀번호 찾기는 추후 지원 예정입니다.
      </p>
    </div>
  );
}
