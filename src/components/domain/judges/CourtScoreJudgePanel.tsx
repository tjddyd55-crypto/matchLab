"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { submitCourtScorecardAction } from "@/features/judge-court/actions";
import { Button } from "@/components/ui/button";
import type { CourtJudgeMatchVM } from "@/lib/services/judge-court.service";
import { JudgeDecisionMethod } from "@/lib/enums";

export function CourtScoreJudgePanel({ match }: { match: CourtJudgeMatchVM }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      setError(null);
      setMessage(null);
      const res = await submitCourtScorecardAction(fd);
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      setMessage("채점이 전송되었습니다.");
      router.refresh();
    });
  }

  if (!match.matchId || match.status !== "ongoing") {
    return (
      <div className="rounded-xl border border-dashed p-6 text-center">
        <p className="font-medium">{match.courtName}</p>
        <p className="text-muted-foreground mt-2 text-sm">
          현재 진행중인 경기가 없습니다.
        </p>
      </div>
    );
  }

  const inputClass = "border-input bg-background h-10 rounded-md border px-3 text-sm";

  return (
    <form onSubmit={onSubmit} className="mx-auto flex max-w-2xl flex-col gap-5 p-4">
      <input type="hidden" name="courtId" value={match.courtId} />
      <input type="hidden" name="matchId" value={match.matchId} />

      <header className="rounded-xl border bg-card p-4">
        <p className="text-muted-foreground text-xs">{match.eventTitle}</p>
        <h1 className="mt-1 text-xl font-bold">{match.courtName} 채점심판</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {match.divisionLabel ?? "경기구분 미상"}
          {match.courtOrder != null ? ` · ${match.courtOrder}경기` : ""}
        </p>
        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-stretch overflow-hidden rounded-lg border">
          <div className="bg-red-500/5 p-3">
            <p className="text-xs font-semibold text-red-700">홍코너</p>
            <p className="text-lg font-bold">{match.fighterRedName}</p>
          </div>
          <div className="flex items-center bg-muted/30 px-4 font-black">VS</div>
          <div className="bg-blue-500/5 p-3 text-right">
            <p className="text-xs font-semibold text-blue-700">청코너</p>
            <p className="text-lg font-bold">{match.fighterBlueName}</p>
          </div>
        </div>
      </header>

      <section className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground text-xs">이름</span>
          <input name="judgeName" required className={inputClass} />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground text-xs">생년월일</span>
          <input name="birthDate" type="date" required className={inputClass} />
        </label>
      </section>

      <section className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span className="text-red-700 text-xs">홍 점수</span>
          <input name="redScore" type="number" min={0} max={10} required className={inputClass} />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-blue-700 text-xs">청 점수</span>
          <input name="blueScore" type="number" min={0} max={10} required className={inputClass} />
        </label>
        <label className="grid gap-1 text-sm sm:col-span-2">
          <span className="text-muted-foreground text-xs">판정 방식</span>
          <select name="decisionMethod" className={inputClass} defaultValue={JudgeDecisionMethod.decision}>
            {Object.values(JudgeDecisionMethod).map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm sm:col-span-2">
          <span className="text-muted-foreground text-xs">메모</span>
          <textarea name="memo" rows={3} className="border-input bg-background rounded-md border px-3 py-2 text-sm" />
        </label>
      </section>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "전송 중…" : "채점 전송"}
      </Button>
    </form>
  );
}
