"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  getMyCourtScorecardAction,
  submitCourtScorecardAction,
} from "@/features/judge-court/actions";
import { Button } from "@/components/ui/button";
import { BoutFormatBadge } from "@/components/domain/shared/BoutFormatBadge";
import { effectiveScoringRoundCount } from "@/lib/court-judge-rounds";
import type {
  CourtJudgeCourtVM,
  CourtJudgeMatchVM,
  CourtJudgeMyScorecardVM,
  CourtMatchScoreSummaryVM,
} from "@/lib/services/judge-court.service";
import { matchRequiresScoreJudge } from "@/lib/court-judge-page-state";
import type { CourtJudgeScene } from "@/lib/court-judge-page-state";
import { JudgeDecisionMethod } from "@/lib/enums";
import { CourtJudgeRefreshShell } from "./CourtJudgeRefreshShell";
import { CourtJudgeFightersHeader } from "./CourtJudgeMatchList";
import { CourtJudgeEmptyState } from "./CourtJudgeEmptyState";
import { CourtJudgeScoreNotRequiredNotice } from "./CourtJudgeSceneBanner";
import { CourtJudgeScreenShell } from "./CourtJudgeScreenShell";

type RoundState = { roundNumber: number; redScore: string; blueScore: string };

function buildInitialRounds(count: number, existing?: CourtJudgeMyScorecardVM | null): RoundState[] {
  return Array.from({ length: count }, (_, index) => {
    const roundNumber = index + 1;
    const existingRound = existing?.rounds.find((r) => r.roundNumber === roundNumber);
    return {
      roundNumber,
      redScore: existingRound?.redScore != null ? String(existingRound.redScore) : "",
      blueScore: existingRound?.blueScore != null ? String(existingRound.blueScore) : "",
    };
  });
}

function SubmittedSummary({ scorecard }: { scorecard: CourtJudgeMyScorecardVM }) {
  return (
    <div className="rounded-lg border border-emerald-300 bg-emerald-50/80 p-3 text-sm dark:bg-emerald-950/30">
      <p className="font-medium text-emerald-800 dark:text-emerald-200">채점 전송 완료</p>
      <p className="text-muted-foreground mt-1 text-xs">
        홍 {scorecard.redTotal ?? "—"} · 청 {scorecard.blueTotal ?? "—"} · 제출{" "}
        {scorecard.submittedAt
          ? new Date(scorecard.submittedAt).toLocaleTimeString("ko-KR", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "—"}
      </p>
      <ul className="mt-2 grid gap-1 text-xs sm:grid-cols-2">
        {scorecard.rounds.map((round) => (
          <li key={round.roundNumber}>
            {round.roundNumber}R: 홍 {round.redScore ?? "—"} / 청 {round.blueScore ?? "—"}
          </li>
        ))}
      </ul>
    </div>
  );
}

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
  const [loadingMine, setLoadingMine] = useState(true);
  const [myScorecard, setMyScorecard] = useState<CourtJudgeMyScorecardVM | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const roundCount = effectiveScoringRoundCount(match);
  const [rounds, setRounds] = useState<RoundState[]>(() => buildInitialRounds(roundCount));
  const [decisionMethod, setDecisionMethod] = useState<JudgeDecisionMethod>(
    JudgeDecisionMethod.decision,
  );
  const [memo, setMemo] = useState("");

  useEffect(() => {
    let cancelled = false;
    const fd = new FormData();
    fd.set("courtId", match.courtId);
    fd.set("matchId", match.matchId);
    fd.set("judgeName", judgeName);
    fd.set("birthDate", birthDate);
    void getMyCourtScorecardAction(fd).then((res) => {
      if (cancelled) return;
      if (res.ok && res.data.scorecard) {
        setMyScorecard(res.data.scorecard);
        setRounds(buildInitialRounds(roundCount, res.data.scorecard));
        setDecisionMethod(res.data.scorecard.decisionMethod ?? JudgeDecisionMethod.decision);
        setMemo(res.data.scorecard.memo ?? "");
      } else {
        setMyScorecard(null);
        setRounds(buildInitialRounds(roundCount));
      }
      setLoadingMine(false);
    });
    return () => {
      cancelled = true;
    };
  }, [match.courtId, match.matchId, judgeName, birthDate, roundCount]);

  const inputClass =
    "border-input bg-background h-11 w-full rounded-md border px-3 text-base";

  function updateRound(roundNumber: number, patch: Partial<RoundState>) {
    setRounds((prev) =>
      prev.map((round) =>
        round.roundNumber === roundNumber ? { ...round, ...patch } : round,
      ),
    );
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      setError(null);
      setMessage(null);
      const fd = new FormData();
      fd.set("courtId", match.courtId);
      fd.set("matchId", match.matchId);
      fd.set("judgeName", judgeName);
      fd.set("birthDate", birthDate);
      fd.set("decisionMethod", decisionMethod);
      fd.set("memo", memo);
      fd.set(
        "roundsJson",
        JSON.stringify(
          rounds.map((round) => ({
            roundNumber: round.roundNumber,
            redScore: Number(round.redScore),
            blueScore: Number(round.blueScore),
          })),
        ),
      );
      const res = await submitCourtScorecardAction(fd);
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      setMessage("채점이 전송되었습니다.");
      router.refresh();
      const reloadFd = new FormData();
      reloadFd.set("courtId", match.courtId);
      reloadFd.set("matchId", match.matchId);
      reloadFd.set("judgeName", judgeName);
      reloadFd.set("birthDate", birthDate);
      const mine = await getMyCourtScorecardAction(reloadFd);
      if (mine.ok) {
        setMyScorecard(mine.data.scorecard);
      }
    });
  }

  const readOnly = myScorecard?.isLocked ?? false;

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <BoutFormatBadge
          bracketType={match.bracketType}
          bracketIsPublic={match.bracketIsPublic}
        />
        <span className="text-muted-foreground">{match.operationalSettingsLabel}</span>
      </div>

      <CourtJudgeFightersHeader match={match} />

      {loadingMine ? (
        <p className="text-muted-foreground text-sm">제출 상태 확인 중…</p>
      ) : myScorecard ? (
        <SubmittedSummary scorecard={myScorecard} />
      ) : null}

      <div className="space-y-3">
        {rounds.map((round) => (
          <fieldset
            key={round.roundNumber}
            className="rounded-lg border p-3"
            disabled={readOnly}
          >
            <legend className="px-1 text-sm font-semibold">
              {round.roundNumber}라운드
              {round.roundNumber > match.roundCount ? " (연장)" : ""}
            </legend>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <label className="grid gap-1 text-sm">
                <span className="text-red-700 text-xs">레드 점수</span>
                <input
                  type="number"
                  min={0}
                  max={10}
                  required
                  className={inputClass}
                  value={round.redScore}
                  onChange={(e) =>
                    updateRound(round.roundNumber, { redScore: e.target.value })
                  }
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-blue-700 text-xs">블루 점수</span>
                <input
                  type="number"
                  min={0}
                  max={10}
                  required
                  className={inputClass}
                  value={round.blueScore}
                  onChange={(e) =>
                    updateRound(round.roundNumber, { blueScore: e.target.value })
                  }
                />
              </label>
            </div>
          </fieldset>
        ))}
      </div>

      <label className="grid gap-1 text-sm">
        <span className="text-muted-foreground text-xs">판정 방식</span>
        <select
          name="decisionMethod"
          className={inputClass}
          value={decisionMethod}
          disabled={readOnly}
          onChange={(e) => setDecisionMethod(e.target.value as JudgeDecisionMethod)}
        >
          {Object.values(JudgeDecisionMethod).map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        <span className="text-muted-foreground text-xs">메모</span>
        <textarea
          name="memo"
          rows={3}
          className="border-input bg-background rounded-md border px-3 py-2 text-sm"
          value={memo}
          disabled={readOnly}
          onChange={(e) => setMemo(e.target.value)}
        />
      </label>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {!readOnly ? (
        <Button type="submit" disabled={pending} size="lg" className="w-full sm:w-auto">
          {pending ? "전송 중…" : myScorecard ? "채점 재전송" : "채점 전송"}
        </Button>
      ) : (
        <p className="text-muted-foreground text-sm">경기 종료 후에는 채점을 수정할 수 없습니다.</p>
      )}
    </form>
  );
}

function ScoreDetail({
  matches,
  ongoingMatchId,
  scene,
  judgeName,
  birthDate,
}: {
  matches: CourtJudgeMatchVM[];
  ongoingMatchId: string | null;
  scene: CourtJudgeScene;
  judgeName: string;
  birthDate: string;
}) {
  if (scene !== "active" || !ongoingMatchId) {
    return (
      <CourtJudgeEmptyState
        scene={scene === "active" ? "no_ongoing_match" : scene}
        matches={matches}
        role="score"
      />
    );
  }

  const ongoing = matches.find((m) => m.matchId === ongoingMatchId) ?? null;
  if (!ongoing) {
    return (
      <CourtJudgeEmptyState
        scene="no_ongoing_match"
        matches={matches}
        role="score"
      />
    );
  }

  if (!matchRequiresScoreJudge(ongoing)) {
    return (
      <div className="space-y-4">
        <CourtJudgeScoreNotRequiredNotice />
        <CourtJudgeEmptyState scene="no_ongoing_match" matches={matches} role="score" />
      </div>
    );
  }

  return (
    <ScoreForm
      key={`${ongoing.matchId}-${effectiveScoringRoundCount(ongoing)}`}
      match={ongoing}
      judgeName={judgeName}
      birthDate={birthDate}
    />
  );
}

export function CourtScoreJudgePanel({
  court,
  matches,
  ongoingMatchId,
  scoreSummariesByMatchId,
  scene,
  judgeName,
  birthDate,
}: {
  court: CourtJudgeCourtVM;
  matches: CourtJudgeMatchVM[];
  ongoingMatchId: string | null;
  scoreSummariesByMatchId: Record<string, CourtMatchScoreSummaryVM>;
  scene: CourtJudgeScene;
  judgeName: string;
  birthDate: string;
}) {
  return (
    <CourtJudgeRefreshShell>
      <CourtJudgeScreenShell
        court={court}
        matches={matches}
        ongoingMatchId={ongoingMatchId}
        roleLabel="채점심판"
        mobileDetailFirst
        selectable={false}
        scoreSummariesByMatchId={scoreSummariesByMatchId}
        detail={() => (
          <ScoreDetail
            matches={matches}
            ongoingMatchId={ongoingMatchId}
            scene={scene}
            judgeName={judgeName}
            birthDate={birthDate}
          />
        )}
      />
    </CourtJudgeRefreshShell>
  );
}
