"use client";

import { useSyncExternalStore, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  readCourtJudgeSession,
  writeCourtJudgeSession,
  type CourtJudgeRole,
} from "@/lib/court-judge-session";

function subscribeNoop() {
  return () => {};
}

export function CourtJudgeIdentityGate({
  courtId,
  role,
  roleLabel,
  children,
}: {
  courtId: string;
  role: CourtJudgeRole;
  roleLabel: string;
  children: (session: { judgeName: string; birthDate: string }) => React.ReactNode;
}) {
  const storedSession = useSyncExternalStore(
    subscribeNoop,
    () => readCourtJudgeSession(courtId, role),
    () => null,
  );
  const [session, setSession] = useState(storedSession);
  const [error, setError] = useState<string | null>(null);

  const activeSession = session ?? storedSession;

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const judgeName = String(fd.get("judgeName") ?? "").trim();
    const birthDate = String(fd.get("birthDate") ?? "").trim();
    const saved = writeCourtJudgeSession(courtId, role, { judgeName, birthDate });
    if (!saved) {
      setError("이름과 생년월일을 올바르게 입력해 주세요.");
      return;
    }
    setError(null);
    setSession(saved);
  }

  if (!activeSession) {
    const inputClass = "border-input bg-background h-10 w-full rounded-md border px-3 text-sm";
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center gap-5 p-4">
        <header className="space-y-1 text-center">
          <h1 className="text-xl font-bold">{roleLabel} 입장</h1>
          <p className="text-muted-foreground text-sm">
            QR 접속 후 이름과 생년월일을 입력하면 {roleLabel} 화면으로 이동합니다.
          </p>
        </header>
        <form onSubmit={onSubmit} className="space-y-3 rounded-xl border bg-card p-4">
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground text-xs">이름</span>
            <input name="judgeName" required autoComplete="name" className={inputClass} />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground text-xs">생년월일</span>
            <input
              name="birthDate"
              type="date"
              required
              autoComplete="bday"
              className={inputClass}
            />
          </label>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full">
            입장
          </Button>
        </form>
      </div>
    );
  }

  return <>{children(activeSession)}</>;
}
