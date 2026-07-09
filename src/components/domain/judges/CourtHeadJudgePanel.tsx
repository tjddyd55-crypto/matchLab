"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
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
import type {
  CourtJudgeCourtVM,
  CourtJudgeMatchVM,
  CourtJudgeScorecardVM,
  CourtMatchScoreSummaryVM,
} from "@/lib/services/judge-court.service";
import { BracketMatchOutcomeStyle, BracketMatchStatus } from "@/lib/enums";
import type { CourtJudgeScene } from "@/lib/court-judge-page-state";
import { resolveHeadActionMatchId } from "@/lib/court-judge-page-state";
import { sanitizeJudgeVisibleMemo } from "@/lib/match-result-memo";
import { BoutFormatBadge } from "@/components/domain/shared/BoutFormatBadge";
import { CourtJudgeRefreshShell } from "./CourtJudgeRefreshShell";
import { CourtJudgeScorecardInlineList } from "./CourtJudgeScorecardDetail";
import {
  CourtJudgeFightersHeader,
  resultSummary,
} from "./CourtJudgeMatchList";
import { CourtJudgeEmptyState } from "./CourtJudgeEmptyState";
import { CourtJudgeSceneBanner } from "./CourtJudgeSceneBanner";
import { CourtJudgeScreenShell } from "./CourtJudgeScreenShell";

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
  const inputClass = "border-input bg-background h-10 rounded-md border px-2 text-sm";

  const hasOngoing = Boolean(ongoingMatchId);

  function run(
    formData: FormData,
    fn: (fd: FormData) => Promise<{ ok: boolean; error?: { message: string } }>,
  ) {
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
    <form onSubmit={saveOperationalSettings} className="grid gap-3 rounded-xl border p-4 md:grid-cols-4">
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
  ) : null;

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b bg-muted/30 px-4 py-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span>
              {match.divisionLabel ?? "경기구분 미상"}
              {match.courtOrder != null ? ` · ${match.courtOrder}경기` : ""}
            </span>
            <BoutFormatBadge
              bracketType={match.bracketType}
              bracketIsPublic={match.bracketIsPublic}
            />
            <span className="text-muted-foreground text-xs">
              {match.operationalSettingsLabel}
            </span>
          </div>
        </div>
        <div className="p-4">
          <CourtJudgeFightersHeader match={match} />
        </div>
      </section>

      {isCancelled ? (
        <section className="rounded-xl border border-border/70 bg-muted/20 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-muted-foreground/30 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              취소
            </span>
            <p className="text-sm font-medium">경기가 취소되었습니다.</p>
          </div>
          {cancelledMemo ? (
            <p className="text-muted-foreground mt-2 text-sm">취소 사유: {cancelledMemo}</p>
          ) : null}
        </section>
      ) : null}

      {isFinished ? (
        <section className="rounded-xl border border-border/70 bg-muted/20 p-4">
          <h2 className="text-sm font-semibold">경기 결과</h2>
          <p className="text-muted-foreground mt-2 text-sm">{summary ?? "—"}</p>
        </section>
      ) : null}

      {isWaiting ? (
        <section className="rounded-xl border p-4">
          <p className="text-muted-foreground text-sm">
            대기 중인 경기입니다. 준비되면 경기준비를 시작하세요.
          </p>
          <Button
            type="button"
            size="lg"
            className="mt-3 w-full sm:w-auto"
            disabled={pending || hasOngoing}
            onClick={() => prepareMatch(match.matchId)}
          >
            경기 준비
          </Button>
          {hasOngoing ? (
            <p className="text-muted-foreground mt-2 text-xs">
              다른 경기가 진행/준비 중이면 새 경기를 준비할 수 없습니다.
            </p>
          ) : null}
        </section>
      ) : null}

      {isPreparing ? (
        <section className="space-y-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <p className="text-primary text-sm font-medium">경기준비중</p>
          {operationalForm}
          <Button
            type="button"
            size="lg"
            className="w-full sm:w-auto"
            disabled={pending || hasOngoing}
            onClick={() => startMatch(match.matchId)}
          >
            경기 시작
          </Button>
        </section>
      ) : null}

      {isOngoing ? (
        <>
          {operationalForm}

          <section className="rounded-xl border p-4">
            <h2 className="font-semibold">채점심판 제출 현황</h2>
            <CourtJudgeScorecardInlineList scorecards={scorecards} />
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
              className="border-input bg-background rounded-md border px-2 py-2 text-sm md:col-span-3"
            />
            <div className="md:col-span-3">
              <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={pending}>
                완료
              </Button>
            </div>
          </form>

          <form
            onSubmit={cancel}
            className="flex flex-col gap-2 rounded-xl border p-4 md:flex-row md:items-end"
          >
            <input type="hidden" name="courtId" value={match.courtId} />
            <input type="hidden" name="matchId" value={match.matchId} />
            <label className="grid flex-1 gap-1 text-sm">
              <span className="text-muted-foreground text-xs">경기취소 사유</span>
              <input name="reason" className={inputClass} />
            </label>
            <Button type="submit" variant="destructive" size="lg" disabled={pending}>
              경기 취소
            </Button>
          </form>
        </>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
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
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  const actionMatchId = useMemo(
    () => resolveHeadActionMatchId(matches, ongoingMatchId, selectedMatchId),
    [matches, ongoingMatchId, selectedMatchId],
  );

  const actionMatch = matches.find((m) => m.matchId === actionMatchId) ?? null;
  const scorecards =
    actionMatch?.status === BracketMatchStatus.ongoing ||
    actionMatch?.status === BracketMatchStatus.finished
      ? (scorecardsByMatchId[actionMatch.matchId] ?? [])
      : [];

  function renderMain() {
    if (matches.length === 0) {
      return <CourtJudgeEmptyState scene="no_matches" matches={matches} role="head" />;
    }

    if (scene !== "active" && !actionMatch) {
      return <CourtJudgeEmptyState scene={scene} matches={matches} role="head" />;
    }

    if (!actionMatch) {
      return (
        <div className="space-y-4">
          {scene !== "active" ? <CourtJudgeSceneBanner scene={scene} role="head" /> : null}
          <CourtJudgeEmptyState
            scene={scene === "active" ? "no_ongoing_match" : scene}
            matches={matches}
            role="head"
          />
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {scene !== "active" && !ongoingMatchId ? (
          <CourtJudgeSceneBanner scene={scene} role="head" />
        ) : null}
        <HeadMatchDetail
          match={actionMatch}
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
        queueTitle="경기 대기열"
        queueSelectable
        selectedMatchId={actionMatchId ?? selectedMatchId}
        onSelectMatch={setSelectedMatchId}
        scoreSummariesByMatchId={scoreSummariesByMatchId}
      >
        {renderMain()}
      </CourtJudgeScreenShell>
    </CourtJudgeRefreshShell>
  );
}
