"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { submitCourtScorecardAction } from "@/features/judge-court/actions";
import { Button } from "@/components/ui/button";
import type {
  CourtJudgeCourtVM,
  CourtJudgeMatchVM,
} from "@/lib/services/judge-court.service";
import { JudgeDecisionMethod } from "@/lib/enums";
import { CourtJudgeIdentityGate } from "./CourtJudgeIdentityGate";
import { CourtJudgeRefreshShell } from "./CourtJudgeRefreshShell";
import {
  CourtJudgeFightersHeader,
} from "./CourtJudgeMatchList";
import {
  CourtJudgeEmptyNotice,
  CourtJudgeScreenShell,
} from "./CourtJudgeScreenShell";

function ScoreForm({
  match,
  judgeName,
  birthDate,
}: {
  match: CourtJudgeMatchVM;
  judgeName: string;
  birthDate: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputClass = "border-input bg-background h-10 rounded-md border px-3 text-sm";

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

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border p-4">
      <input type="hidden" name="courtId" value={match.courtId} />
      <input type="hidden" name="matchId" value={match.matchId} />
      <input type="hidden" name="judgeName" value={judgeName} />
      <input type="hidden" name="birthDate" value={birthDate} />

      <CourtJudgeFightersHeader match={match} />

      <div className="grid gap-3 sm:grid-cols-2">
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
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm sm:col-span-2">
          <span className="text-muted-foreground text-xs">메모</span>
          <textarea
            name="memo"
            rows={3}
            className="border-input bg-background rounded-md border px-3 py-2 text-sm"
          />
        </label>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "전송 중…" : "채점 전송"}
      </Button>
    </form>
  );
}

function ScoreDetail({
  matches,
  ongoingMatchId,
  judgeName,
  birthDate,
}: {
  matches: CourtJudgeMatchVM[];
  ongoingMatchId: string | null;
  judgeName: string;
  birthDate: string;
}) {
  if (!ongoingMatchId) {
    return (
      <CourtJudgeEmptyNotice>
        현재 진행중인 경기가 없습니다. 주심판이 경기 시작을 누르면 채점할 수 있습니다.
      </CourtJudgeEmptyNotice>
    );
  }

  const ongoing = matches.find((m) => m.matchId === ongoingMatchId) ?? null;
  if (!ongoing) {
    return (
      <CourtJudgeEmptyNotice>
        진행중 경기만 채점할 수 있습니다. 리스트에서 파란색으로 강조된 경기를 확인하세요.
      </CourtJudgeEmptyNotice>
    );
  }

  return <ScoreForm match={ongoing} judgeName={judgeName} birthDate={birthDate} />;
}

export function CourtScoreJudgePanel({
  court,
  matches,
  ongoingMatchId,
}: {
  court: CourtJudgeCourtVM;
  matches: CourtJudgeMatchVM[];
  ongoingMatchId: string | null;
}) {
  return (
    <CourtJudgeIdentityGate courtId={court.courtId} role="score" roleLabel="채점심판">
      {(session) => (
        <CourtJudgeRefreshShell>
          <CourtJudgeScreenShell
            court={court}
            matches={matches}
            ongoingMatchId={ongoingMatchId}
            roleLabel="채점심판"
            mobileDetailFirst
            selectable={false}
            detail={() => (
              <ScoreDetail
                matches={matches}
                ongoingMatchId={ongoingMatchId}
                judgeName={session.judgeName}
                birthDate={session.birthDate}
              />
            )}
          />
        </CourtJudgeRefreshShell>
      )}
    </CourtJudgeIdentityGate>
  );
}
