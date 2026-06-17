"use client";

import { useSyncExternalStore, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  clearCourtJudgeSession,
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
  eventTitle,
  courtName,
  children,
}: {
  courtId: string;
  role: CourtJudgeRole;
  roleLabel: string;
  eventTitle: string;
  courtName: string;
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

  function switchIdentity() {
    clearCourtJudgeSession(courtId, role);
    setSession(null);
    setError(null);
  }

  if (!activeSession) {
    const inputClass = "border-input bg-background h-11 w-full rounded-md border px-3 text-base";
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center gap-5 p-4">
        <header className="space-y-3 text-center">
          <p className="text-primary text-2xl font-black tracking-tight">MATCHON</p>
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm">{eventTitle}</p>
            <p className="text-lg font-semibold">{courtName}</p>
            <p className="text-primary text-sm font-medium">{roleLabel} 입장</p>
          </div>
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
          <Button type="submit" size="lg" className="w-full">
            입장하기
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 pt-4">
        <p className="text-muted-foreground text-xs">
          {activeSession.judgeName} · {roleLabel}
        </p>
        <Button type="button" variant="outline" size="sm" onClick={switchIdentity}>
          정보 변경
        </Button>
      </div>
      {children(activeSession)}
    </div>
  );
}
