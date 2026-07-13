"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  getMyCourtScorecardAction,
  submitCourtScorecardAction,
} from "@/features/judge-court/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import { BoutFormatBadge } from "@/components/domain/shared/BoutFormatBadge";
import { effectiveScoringRoundCount } from "@/lib/court-judge-rounds";
import type {
  CourtJudgeCourtVM,
  CourtJudgeMatchVM,
  CourtJudgeMyScorecardVM,
  CourtMatchScoreSummaryVM,
} from "@/lib/services/judge-court.service";
import { matchRequiresScoreJudge } from "@/lib/court-judge-page-state";
import { BracketMatchStatus } from "@/lib/enums";
import { JudgeDecisionMethod } from "@/lib/enums";
import { sanitizeJudgeVisibleMemo } from "@/lib/match-result-memo";
import { CourtJudgeRefreshShell } from "./CourtJudgeRefreshShell";
import {
  CourtJudgeFightersHeader,
  resultSummary,
} from "./CourtJudgeMatchList";
import { CourtJudgeEmptyState } from "./CourtJudgeEmptyState";
import { CourtJudgeScoreNotRequiredNotice } from "./CourtJudgeSceneBanner";
import { CourtJudgeEmptyNotice, CourtJudgeScreenShell } from "./CourtJudgeScreenShell";
import {
  judgeFieldInputClass,
  judgeFieldTextareaClass,
  matchonBlueCornerTextClass,
  matchonRedCornerTextClass,
  resolveBracketMatchMatchonStatus,
  resolveScoreSubmissionMatchonStatus,
} from "@/lib/ui/judge-ui";

type RoundState = { roundNumber: number; redScore: string; blueScore: string };

function normalizeScoreInput(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  return Number(trimmed);
}

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
    <FeedbackMessage tone="success">
      <span className="font-semibold">채점 전송 완료</span>
      <span className="mt-1 block text-sm font-normal">
        홍 {scorecard.redTotal ?? "—"} · 청 {scorecard.blueTotal ?? "—"} · 제출{" "}
        {scorecard.submittedAt
          ? new Date(scorecard.submittedAt).toLocaleTimeString("ko-KR", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "—"}
      </span>
      <ul className="mt-2 grid gap-1 text-xs font-normal sm:grid-cols-2">
        {scorecard.rounds.map((round) => (
          <li key={round.roundNumber}>
            {round.roundNumber}R: 홍 {round.redScore ?? "—"} / 청 {round.blueScore ?? "—"}
          </li>
        ))}
      </ul>
    </FeedbackMessage>
  );
}

function MatchInfoHeader({ match }: { match: CourtJudgeMatchVM }) {
  const orderLabel =
    match.courtOrder != null ? `${match.courtOrder}경기` : `#${match.matchNumber ?? "?"}`;

  return (
    <Card variant="default" className="overflow-hidden py-0">
      <CardHeader className="border-b bg-muted/30 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium">
            {orderLabel}
            {" · "}
            {match.divisionLabel ?? "경기구분 미상"}
          </span>
          <MatchonStatusBadge
            status={resolveBracketMatchMatchonStatus(match.status)}
            size="sm"
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <BoutFormatBadge
            bracketType={match.bracketType}
            bracketIsPublic={match.bracketIsPublic}
            matchIsPublicSparring={match.matchIsPublicSparring}
            resultMemo={match.resultMemo}
          />
          <span className="text-muted-foreground text-xs">{match.operationalSettingsLabel}</span>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <CourtJudgeFightersHeader match={match} />
      </CardContent>
    </Card>
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

  const inputClass = judgeFieldInputClass;

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
            redScore: normalizeScoreInput(round.redScore),
            blueScore: normalizeScoreInput(round.blueScore),
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
    <Card variant="default" className="py-4">
      <CardContent className="space-y-4 px-4">
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-primary text-sm font-semibold">현재 채점할 경기</p>
        {myScorecard ? (
          <MatchonStatusBadge
            status={resolveScoreSubmissionMatchonStatus({
              submitted: true,
              locked: myScorecard.isLocked,
            })}
            label={myScorecard.isLocked ? "제출완료" : "저장됨"}
            size="sm"
          />
        ) : null}
      </div>

      {loadingMine ? (
        <p className="text-muted-foreground text-sm">제출 상태 확인 중…</p>
      ) : myScorecard ? (
        <SubmittedSummary scorecard={myScorecard} />
      ) : null}

      <div className="space-y-3">
        <p className="text-muted-foreground text-xs">0점은 비워두면 됩니다.</p>
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
                <span className={matchonRedCornerTextClass}>레드 점수</span>
                <input
                  type="number"
                  min={0}
                  max={10}
                  placeholder="0"
                  className={inputClass}
                  value={round.redScore}
                  onChange={(e) =>
                    updateRound(round.roundNumber, { redScore: e.target.value })
                  }
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className={matchonBlueCornerTextClass}>블루 점수</span>
                <input
                  type="number"
                  min={0}
                  max={10}
                  placeholder="0"
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
          className={judgeFieldTextareaClass}
          value={memo}
          disabled={readOnly}
          onChange={(e) => setMemo(e.target.value)}
        />
      </label>

      {error ? (
        <FeedbackMessage tone="error" role="alert">
          {error}
        </FeedbackMessage>
      ) : null}
      {message ? (
        <FeedbackMessage tone="success">{message}</FeedbackMessage>
      ) : null}
      {!readOnly ? (
        <Button type="submit" disabled={pending} size="field" className="w-full sm:w-auto">
          {pending ? "전송 중…" : myScorecard ? "채점 재전송" : "채점 전송"}
        </Button>
      ) : (
        <FeedbackMessage tone="info">
          경기 종료 후에는 채점을 수정할 수 없습니다.
        </FeedbackMessage>
      )}
    </form>
      </CardContent>
    </Card>
  );
}

function FinishedScoreDetail({
  match,
  judgeName,
  birthDate,
  scoreSummary,
}: {
  match: CourtJudgeMatchVM;
  judgeName: string;
  birthDate: string;
  scoreSummary?: CourtMatchScoreSummaryVM | null;
}) {
  const [loading, setLoading] = useState(true);
  const [myScorecard, setMyScorecard] = useState<CourtJudgeMyScorecardVM | null>(null);
  const summary = resultSummary(match);

  useEffect(() => {
    let cancelled = false;
    const fd = new FormData();
    fd.set("courtId", match.courtId);
    fd.set("matchId", match.matchId);
    fd.set("judgeName", judgeName);
    fd.set("birthDate", birthDate);
    void getMyCourtScorecardAction(fd).then((res) => {
      if (cancelled) return;
      setMyScorecard(res.ok ? res.data.scorecard : null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [match.courtId, match.matchId, judgeName, birthDate]);

  const canResubmit = myScorecard && !myScorecard.isLocked;

  return (
    <div className="space-y-4">
      <Card variant="muted" className="py-4">
        <CardContent className="px-4">
          <h2 className="text-sm font-semibold">이미 종료된 경기입니다</h2>
          <p className="text-muted-foreground mt-1 text-xs">
            결과와 제출 상태를 확인할 수 있습니다.
          </p>
          <p className="text-muted-foreground mt-3 text-sm">{summary ?? "—"}</p>
          {scoreSummary ? (
            <p className="text-muted-foreground mt-2 text-xs">{scoreSummary.label}</p>
          ) : null}
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-muted-foreground text-sm">제출 상태 확인 중…</p>
      ) : myScorecard ? (
        <SubmittedSummary scorecard={myScorecard} />
      ) : (
        <CourtJudgeEmptyNotice>제출한 채점표가 없습니다.</CourtJudgeEmptyNotice>
      )}

      {canResubmit ? (
        <ScoreForm
          key={`${match.matchId}-resubmit-${effectiveScoringRoundCount(match)}`}
          match={match}
          judgeName={judgeName}
          birthDate={birthDate}
        />
      ) : null}
    </div>
  );
}

function ScoreDetail({
  match,
  matches,
  judgeName,
  birthDate,
  scoreSummary,
}: {
  match: CourtJudgeMatchVM | null;
  matches: CourtJudgeMatchVM[];
  judgeName: string;
  birthDate: string;
  scoreSummary?: CourtMatchScoreSummaryVM | null;
}) {
  if (matches.length === 0) {
    return <CourtJudgeEmptyState scene="no_matches" matches={matches} role="score" />;
  }

  if (!match) {
    return (
      <CourtJudgeEmptyNotice>경기 리스트에서 경기를 선택해 주세요.</CourtJudgeEmptyNotice>
    );
  }

  if (match.status === BracketMatchStatus.cancelled) {
    const reason = sanitizeJudgeVisibleMemo(match.displayResultMemo);
    return (
      <div className="space-y-4">
        <MatchInfoHeader match={match} />
        <Card variant="muted" className="py-4">
          <CardContent className="space-y-2 px-4">
            <MatchonStatusBadge status="cancelled" label="경기취소" size="sm" />
            <FeedbackMessage tone="warning">취소된 경기입니다.</FeedbackMessage>
            {reason ? (
              <p className="text-muted-foreground text-sm">취소 사유: {reason}</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (match.status === BracketMatchStatus.finished) {
    return (
      <div className="space-y-4">
        <MatchInfoHeader match={match} />
        <FinishedScoreDetail
          match={match}
          judgeName={judgeName}
          birthDate={birthDate}
          scoreSummary={scoreSummary}
        />
      </div>
    );
  }

  if (
    match.status === BracketMatchStatus.waiting ||
    match.status === BracketMatchStatus.called
  ) {
    return (
      <div className="space-y-4">
        <MatchInfoHeader match={match} />
        <Card variant="default" className="py-4">
          <CardContent className="px-4">
            <FeedbackMessage tone="info">
              <span className="font-semibold">아직 채점할 수 없습니다</span>
              <span className="mt-1 block text-sm font-normal">
                아직 시작 전입니다. 주심판이 경기를 시작하면 채점할 수 있습니다.
              </span>
            </FeedbackMessage>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (match.status === BracketMatchStatus.ongoing) {
    return (
      <div className="space-y-4">
        <MatchInfoHeader match={match} />
        {!matchRequiresScoreJudge(match) ? (
          <CourtJudgeScoreNotRequiredNotice />
        ) : (
          <ScoreForm
            key={`${match.matchId}-${effectiveScoringRoundCount(match)}`}
            match={match}
            judgeName={judgeName}
            birthDate={birthDate}
          />
        )}
      </div>
    );
  }

  return null;
}

export function CourtScoreJudgePanel({
  court,
  matches,
  ongoingMatchId,
  scoreSummariesByMatchId,
  judgeName,
  birthDate,
}: {
  court: CourtJudgeCourtVM;
  matches: CourtJudgeMatchVM[];
  ongoingMatchId: string | null;
  scoreSummariesByMatchId: Record<string, CourtMatchScoreSummaryVM>;
  scene: import("@/lib/court-judge-page-state").CourtJudgeScene;
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
        scoreSummariesByMatchId={scoreSummariesByMatchId}
        detail={(selected) => (
          <ScoreDetail
            match={selected}
            matches={matches}
            judgeName={judgeName}
            birthDate={birthDate}
            scoreSummary={
              selected ? scoreSummariesByMatchId[selected.matchId] : undefined
            }
          />
        )}
      />
    </CourtJudgeRefreshShell>
  );
}
