"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  headAddOvertimeRoundAction,
  headCancelCourtMatchAction,
  headCompleteCourtMatchAction,
  headPrepareCourtMatchAction,
  headStartCourtMatchAction,
  headUpdateMatchOperationalSettingsAction,
} from "@/features/judge-court/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import type {
  CourtJudgeCourtVM,
  CourtJudgeMatchVM,
  CourtJudgeScorecardVM,
  CourtMatchScoreSummaryVM,
} from "@/lib/services/judge-court.service";
import { BracketMatchOutcomeStyle, BracketMatchStatus } from "@/lib/enums";
import type { CourtJudgeScene } from "@/lib/court-judge-page-state";
import { sanitizeJudgeVisibleMemo } from "@/lib/match-result-memo";
import { CourtJudgeMatchLabels } from "./CourtJudgeMatchLabels";
import { CourtJudgeRefreshShell } from "./CourtJudgeRefreshShell";
import { CourtJudgeScorecardInlineList } from "./CourtJudgeScorecardDetail";
import {
  CourtJudgeFightersHeader,
  resultSummary,
} from "./CourtJudgeMatchList";
import { CourtJudgeEmptyState } from "./CourtJudgeEmptyState";
import { CourtJudgeSceneBanner } from "./CourtJudgeSceneBanner";
import { CourtJudgeScreenShell, CourtJudgeEmptyNotice } from "./CourtJudgeScreenShell";
import {
  judgeFieldInputClass,
  judgeFieldTextareaClass,
  resolveBracketMatchMatchonStatus,
} from "@/lib/ui/judge-ui";

function HeadMatchDetail({
  match,
  ongoingMatchId,
  scorecards,
}: {
  match: CourtJudgeMatchVM | null;
  ongoingMatchId: string | null;
  scorecards: CourtJudgeScorecardVM[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const inputClass = judgeFieldInputClass;

  const hasOngoing = Boolean(ongoingMatchId);

  function run(
    formData: FormData,
    fn: (fd: FormData) => Promise<{ ok: boolean; error?: { message: string } }>,
  ) {
    startTransition(async () => {
      setError(null);
      setSuccess(null);
      const res = await fn(formData);
      if (!res.ok) {
        setError(res.error?.message ?? "처리 실패");
        return;
      }
      setSuccess("처리되었습니다.");
      router.refresh();
    });
  }

  function prepareMatch(matchId: string) {
    const fd = new FormData();
    fd.set("courtId", match?.courtId ?? "");
    fd.set("matchId", matchId);
    run(fd, headPrepareCourtMatchAction);
  }

  function startMatch(matchId: string) {
    const fd = new FormData();
    fd.set("courtId", match?.courtId ?? "");
    fd.set("matchId", matchId);
    run(fd, headStartCourtMatchAction);
  }

  function addOvertimeRound(matchId: string) {
    const fd = new FormData();
    fd.set("courtId", match?.courtId ?? "");
    fd.set("matchId", matchId);
    run(fd, headAddOvertimeRoundAction);
  }

  function complete(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    run(new FormData(e.currentTarget), headCompleteCourtMatchAction);
  }

  function cancel(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    run(new FormData(e.currentTarget), headCancelCourtMatchAction);
  }

  function saveOperationalSettings(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    run(new FormData(e.currentTarget), headUpdateMatchOperationalSettingsAction);
  }

  if (!match) {
    return (
      <CourtJudgeEmptyState
        scene="no_matches"
        matches={[]}
        role="head"
      />
    );
  }

  const summary = resultSummary(match);
  const cancelledMemo = sanitizeJudgeVisibleMemo(match.displayResultMemo);
  const isWaiting = match.status === BracketMatchStatus.waiting;
  const isPreparing = match.status === BracketMatchStatus.called;
  const isOngoing = match.status === BracketMatchStatus.ongoing;
  const isFinished = match.status === BracketMatchStatus.finished;
  const isCancelled = match.status === BracketMatchStatus.cancelled;
  const canEditOps = isPreparing || isOngoing;

  const operationalForm = canEditOps ? (
    <Card variant="default" className="py-4">
      <CardContent className="px-4">
    <form onSubmit={saveOperationalSettings} className="grid gap-3 md:grid-cols-4">
      <input type="hidden" name="courtId" value={match.courtId} />
      <input type="hidden" name="matchId" value={match.matchId} />
      <label className="grid gap-1 text-sm">
        <span className="text-muted-foreground text-xs">라운드 수</span>
        <input
          name="roundCount"
          type="number"
          min={1}
          max={15}
          defaultValue={match.roundCount}
          className={inputClass}
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="text-muted-foreground text-xs">라운드 시간(초)</span>
        <input
          name="roundTimeSec"
          type="number"
          min={30}
          max={600}
          step={30}
          defaultValue={match.roundTimeSec}
          className={inputClass}
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="text-muted-foreground text-xs">연장</span>
        <select
          name="overtimeEnabled"
          className={inputClass}
          defaultValue={match.overtimeEnabled ? "true" : "false"}
        >
          <option value="false">없음</option>
          <option value="true">가능</option>
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        <span className="text-muted-foreground text-xs">연장 라운드</span>
        <input
          name="overtimeRoundCount"
          type="number"
          min={0}
          max={3}
          defaultValue={match.overtimeRoundCount || 1}
          className={inputClass}
        />
      </label>
      <div className="flex flex-wrap gap-2 md:col-span-4">
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          라운드 설정 저장
        </Button>
        {isOngoing ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={pending || match.overtimeRoundCount >= 3}
            onClick={() => addOvertimeRound(match.matchId)}
          >
            연장 라운드 추가
          </Button>
        ) : null}
      </div>
      {match.overtimeEnabled && match.overtimeRoundCount > 0 ? (
        <p className="text-muted-foreground text-xs md:col-span-4">
          연장 {match.overtimeRoundCount}라운드 적용 중
        </p>
      ) : null}
    </form>
      </CardContent>
    </Card>
  ) : null;

  return (
    <div className="space-y-4">
      <Card variant="default" className="overflow-hidden py-0">
        <CardHeader className="border-b bg-muted/30 px-4 py-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">
              {match.courtOrder != null ? `${match.courtOrder}경기 · ` : ""}
              {match.divisionLabel ?? "경기구분 미상"}
            </span>
            <MatchonStatusBadge
              status={resolveBracketMatchMatchonStatus(match.status)}
              size="sm"
            />
          </div>
          <div className="mt-2">
            <CourtJudgeMatchLabels match={match} showDivision={false} />
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <CourtJudgeFightersHeader match={match} />
        </CardContent>
      </Card>

      {isCancelled ? (
        <Card variant="muted" className="py-4">
          <CardContent className="space-y-2 px-4">
            <MatchonStatusBadge status="cancelled" label="경기취소" size="sm" />
            <FeedbackMessage tone="warning">경기가 취소되었습니다.</FeedbackMessage>
            {cancelledMemo ? (
              <p className="text-muted-foreground text-sm">취소 사유: {cancelledMemo}</p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {isFinished ? (
        <Card variant="muted" className="py-4">
          <CardContent className="px-4">
            <h2 className="text-sm font-semibold">경기 결과</h2>
            <p className="text-muted-foreground mt-2 text-sm">{summary ?? "—"}</p>
          </CardContent>
        </Card>
      ) : null}

      {isWaiting ? (
        <Card variant="default" className="py-4">
          <CardContent className="px-4">
            <FeedbackMessage tone="info">
              대기 중인 경기입니다. 준비되면 경기준비를 시작하세요.
            </FeedbackMessage>
            <Button
              type="button"
              size="field"
              className="mt-3 w-full sm:w-auto"
              disabled={pending}
              onClick={() => prepareMatch(match.matchId)}
            >
              경기 준비
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {isPreparing ? (
        <Card variant="default" className="border-primary/30 bg-primary/5 py-4">
          <CardContent className="space-y-4 px-4">
            <p className="text-primary text-sm font-medium">경기준비중</p>
            {operationalForm}
            <Button
              type="button"
              size="field"
              className="w-full sm:w-auto"
              disabled={pending || hasOngoing}
              onClick={() => startMatch(match.matchId)}
            >
              경기 시작
            </Button>
            {hasOngoing ? (
              <FeedbackMessage tone="warning">
                이미 진행 중인 경기가 있습니다. 먼저 현재 경기를 완료해 주세요.
              </FeedbackMessage>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {isOngoing ? (
        <>
          {operationalForm}

          <Card variant="default" className="py-4">
            <CardContent className="px-4">
              <h2 className="font-semibold">채점심판 제출 현황</h2>
              <p className="text-muted-foreground mt-1 text-xs">
                제출 {scorecards.length}건
              </p>
              <CourtJudgeScorecardInlineList scorecards={scorecards} />
            </CardContent>
          </Card>

          <Card variant="default" className="py-4">
            <CardContent className="px-4">
          <form onSubmit={complete} className="grid gap-3 md:grid-cols-3">
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
                {match.fighterRedId ? (
                  <option value={match.fighterRedId}>
                    레드 · {match.fighterRedName}
                  </option>
                ) : null}
                {match.fighterBlueId ? (
                  <option value={match.fighterBlueId}>
                    블루 · {match.fighterBlueName}
                  </option>
                ) : null}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground text-xs">승부 방식</span>
              <select
                name="resultType"
                className={inputClass}
                defaultValue={BracketMatchOutcomeStyle.decision}
              >
                {Object.values(BracketMatchOutcomeStyle).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
            <textarea
              name="resultMemo"
              rows={2}
              placeholder="메모"
              defaultValue={sanitizeJudgeVisibleMemo(match.displayResultMemo) ?? ""}
              className={`${judgeFieldTextareaClass} md:col-span-3`}
            />
            <div className="md:col-span-3">
              <Button type="submit" size="field" className="w-full sm:w-auto" disabled={pending}>
                완료
              </Button>
            </div>
          </form>
            </CardContent>
          </Card>

          <Card variant="default" className="border-destructive/30 py-4">
            <CardContent className="flex flex-col gap-3 px-4 md:flex-row md:items-end">
          <form
            onSubmit={cancel}
            className="flex w-full flex-col gap-3 md:flex-row md:items-end"
          >
            <input type="hidden" name="courtId" value={match.courtId} />
            <input type="hidden" name="matchId" value={match.matchId} />
            <label className="grid flex-1 gap-1 text-sm">
              <span className="text-muted-foreground text-xs">경기취소 사유</span>
              <input name="reason" className={inputClass} />
            </label>
            <Button type="submit" variant="destructive" size="field" disabled={pending}>
              경기 취소
            </Button>
          </form>
            </CardContent>
          </Card>
        </>
      ) : null}

      {error ? (
        <FeedbackMessage tone="error" role="alert">
          {error}
        </FeedbackMessage>
      ) : null}
      {success ? (
        <FeedbackMessage tone="success">{success}</FeedbackMessage>
      ) : null}
    </div>
  );
}

export function CourtHeadJudgePanel({
  court,
  matches,
  ongoingMatchId,
  scorecardsByMatchId,
  scoreSummariesByMatchId,
  scene,
}: {
  court: CourtJudgeCourtVM;
  matches: CourtJudgeMatchVM[];
  ongoingMatchId: string | null;
  scorecardsByMatchId: Record<string, CourtJudgeScorecardVM[]>;
  scoreSummariesByMatchId: Record<string, CourtMatchScoreSummaryVM>;
  scene: CourtJudgeScene;
}) {
  function renderDetail(selected: CourtJudgeMatchVM | null) {
    if (matches.length === 0) {
      return <CourtJudgeEmptyState scene="no_matches" matches={matches} role="head" />;
    }

    if (!selected) {
      return (
        <CourtJudgeEmptyNotice>경기 리스트에서 경기를 선택해 주세요.</CourtJudgeEmptyNotice>
      );
    }

    const scorecards =
      selected.status === BracketMatchStatus.ongoing ||
      selected.status === BracketMatchStatus.finished
        ? (scorecardsByMatchId[selected.matchId] ?? [])
        : [];

    return (
      <div className="space-y-4">
        {scene !== "active" && !ongoingMatchId ? (
          <CourtJudgeSceneBanner scene={scene} role="head" />
        ) : null}
        <HeadMatchDetail
          match={selected}
          ongoingMatchId={ongoingMatchId}
          scorecards={scorecards}
        />
      </div>
    );
  }

  return (
    <CourtJudgeRefreshShell>
      <CourtJudgeScreenShell
        court={court}
        matches={matches}
        ongoingMatchId={ongoingMatchId}
        roleLabel="주심판"
        scoreSummariesByMatchId={scoreSummariesByMatchId}
        detail={(selected) => renderDetail(selected)}
      />
    </CourtJudgeRefreshShell>
  );
}
