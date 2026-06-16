"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  headCancelCourtMatchAction,
  headCompleteCourtMatchAction,
  headStartCourtMatchAction,
} from "@/features/judge-court/actions";
import { Button } from "@/components/ui/button";
import type {
  CourtJudgeMatchVM,
  CourtJudgeScorecardVM,
} from "@/lib/services/judge-court.service";
import { BracketMatchOutcomeStyle } from "@/lib/enums";

const WINNER_LABEL: Record<string, string> = {
  red: "홍",
  blue: "청",
  draw: "무",
  no_contest: "NC",
  undecided: "—",
};

export function CourtHeadJudgePanel({
  match,
  scorecards,
}: {
  match: CourtJudgeMatchVM;
  scorecards: CourtJudgeScorecardVM[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(formData: FormData, fn: (fd: FormData) => Promise<{ ok: boolean; error?: { message: string } }>) {
    startTransition(async () => {
      setError(null);
      const res = await fn(formData);
      if (!res.ok) {
        setError(res.error?.message ?? "처리 실패");
        return;
      }
      router.refresh();
    });
  }

  function startMatch() {
    const fd = new FormData();
    fd.set("courtId", match.courtId);
    run(fd, headStartCourtMatchAction);
  }

  function complete(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    run(new FormData(e.currentTarget), headCompleteCourtMatchAction);
  }

  function cancel(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    run(new FormData(e.currentTarget), headCancelCourtMatchAction);
  }

  const inputClass = "border-input bg-background h-9 rounded-md border px-2 text-sm";

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-5 p-4">
      <header className="rounded-xl border bg-card p-4">
        <p className="text-muted-foreground text-xs">{match.eventTitle}</p>
        <h1 className="mt-1 text-xl font-bold">{match.courtName} 주심판</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          상태: {match.status === "ongoing" ? "진행중" : match.status === "finished" ? "경기종료" : match.status === "cancelled" ? "경기취소" : "대기"}
        </p>
      </header>

      {!match.matchId ? (
        <section className="rounded-xl border border-dashed p-6 text-center">
          <p className="text-muted-foreground text-sm">배정된 경기가 없습니다.</p>
        </section>
      ) : (
        <>
          <section className="overflow-hidden rounded-xl border bg-card">
            <div className="border-b bg-muted/30 px-4 py-3 text-sm">
              {match.divisionLabel ?? "경기구분 미상"}
              {match.courtOrder != null ? ` · ${match.courtOrder}경기` : ""}
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr]">
              <div className="bg-red-500/5 p-4">
                <p className="text-xs font-semibold text-red-700">홍코너</p>
                <p className="text-xl font-bold">{match.fighterRedName}</p>
              </div>
              <div className="flex items-center bg-muted/30 px-5 text-xl font-black">VS</div>
              <div className="bg-blue-500/5 p-4 text-right">
                <p className="text-xs font-semibold text-blue-700">청코너</p>
                <p className="text-xl font-bold">{match.fighterBlueName}</p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border p-4">
            <h2 className="font-semibold">채점심판 전송 결과</h2>
            {scorecards.length === 0 ? (
              <p className="text-muted-foreground mt-2 text-sm">
                전송된 채점이 없습니다. 그래도 주심판 완료는 가능합니다.
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[32rem] text-left text-sm">
                  <thead className="bg-muted/40 text-xs">
                    <tr>
                      <th className="px-2 py-2">심판</th>
                      <th className="px-2 py-2">홍</th>
                      <th className="px-2 py-2">청</th>
                      <th className="px-2 py-2">판정</th>
                      <th className="px-2 py-2">시간</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scorecards.map((s) => (
                      <tr key={`${s.judgeName}-${s.submittedAt}`} className="border-t">
                        <td className="px-2 py-2">{s.judgeName}</td>
                        <td className="px-2 py-2">{s.redTotal ?? "—"}</td>
                        <td className="px-2 py-2">{s.blueTotal ?? "—"}</td>
                        <td className="px-2 py-2">{WINNER_LABEL[s.winnerCorner]}</td>
                        <td className="px-2 py-2">
                          {s.submittedAt ? new Date(s.submittedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <form onSubmit={complete} className="grid gap-3 rounded-xl border p-4 md:grid-cols-3">
            <input type="hidden" name="courtId" value={match.courtId} />
            <input type="hidden" name="matchId" value={match.matchId} />
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground text-xs">결과</span>
              <select name="outcomeMode" className={inputClass} defaultValue="win_loss">
                <option value="win_loss">승패</option>
                <option value="draw">무승부</option>
                <option value="no_contest">노콘테스트</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground text-xs">승자</span>
              <select name="winnerId" className={inputClass} defaultValue="">
                <option value="">승자 선택</option>
                {match.fighterRedId ? <option value={match.fighterRedId}>홍 · {match.fighterRedName}</option> : null}
                {match.fighterBlueId ? <option value={match.fighterBlueId}>청 · {match.fighterBlueName}</option> : null}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground text-xs">승부 방식</span>
              <select name="resultType" className={inputClass} defaultValue={BracketMatchOutcomeStyle.decision}>
                {Object.values(BracketMatchOutcomeStyle).map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </label>
            <textarea name="resultMemo" rows={2} placeholder="메모" className="border-input bg-background rounded-md border px-2 py-2 text-sm md:col-span-3" />
            <div className="flex flex-wrap gap-2 md:col-span-3">
              <Button type="submit" disabled={pending || match.status === "cancelled" || match.status === "finished"}>
                완료
              </Button>
              <Button type="button" variant="outline" disabled={pending} onClick={startMatch}>
                다음 경기 시작
              </Button>
            </div>
          </form>

          <form onSubmit={cancel} className="flex flex-col gap-2 rounded-xl border p-4 md:flex-row md:items-end">
            <input type="hidden" name="courtId" value={match.courtId} />
            <input type="hidden" name="matchId" value={match.matchId} />
            <label className="grid flex-1 gap-1 text-sm">
              <span className="text-muted-foreground text-xs">경기취소 사유</span>
              <input name="reason" className={inputClass} />
            </label>
            <Button type="submit" variant="destructive" disabled={pending || match.status === "finished"}>
              경기 취소
            </Button>
          </form>
        </>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </main>
  );
}
