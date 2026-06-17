"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
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
} from "@/lib/services/judge-court.service";
import { BracketMatchOutcomeStyle, BracketMatchStatus } from "@/lib/enums";
import { BoutFormatBadge } from "@/components/domain/shared/BoutFormatBadge";
import { CourtJudgeIdentityGate } from "./CourtJudgeIdentityGate";
import { CourtJudgeRefreshShell } from "./CourtJudgeRefreshShell";
import {
  CourtJudgeFightersHeader,
  resultSummary,
} from "./CourtJudgeMatchList";
import {
  CourtJudgeEmptyNotice,
  CourtJudgeScreenShell,
} from "./CourtJudgeScreenShell";

const WINNER_LABEL: Record<string, string> = {
  red: "홍",
  blue: "청",
  draw: "무",
  no_contest: "NC",
  undecided: "—",
};

function ScorecardsTable({ scorecards }: { scorecards: CourtJudgeScorecardVM[] }) {
  if (scorecards.length === 0) {
    return (
      <p className="text-muted-foreground mt-2 text-sm">
        전송된 채점이 없습니다. 그래도 주심판 완료는 가능합니다.
      </p>
    );
  }

  return (
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
                {s.submittedAt
                  ? new Date(s.submittedAt).toLocaleTimeString("ko-KR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

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
  const inputClass = "border-input bg-background h-9 rounded-md border px-2 text-sm";

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
      <CourtJudgeEmptyNotice>표시할 경기를 리스트에서 선택하세요.</CourtJudgeEmptyNotice>
    );
  }

  const summary = resultSummary(match);
  const isWaiting = match.status === BracketMatchStatus.waiting;
  const isPreparing = match.status === BracketMatchStatus.called;
  const isOngoing = match.status === BracketMatchStatus.ongoing;
  const isFinished = match.status === BracketMatchStatus.finished;
  const isCancelled = match.status === BracketMatchStatus.cancelled;
  const canEditOps = isPreparing || isOngoing;

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

      {isFinished || isCancelled ? (
        <section className="rounded-xl border p-4">
          <h2 className="font-semibold">경기 결과</h2>
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
            className="mt-3"
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
            <div className="md:col-span-4">
              <Button type="submit" variant="outline" size="sm" disabled={pending}>
                라운드 설정 저장
              </Button>
            </div>
          </form>
          <Button
            type="button"
            disabled={pending || hasOngoing}
            onClick={() => startMatch(match.matchId)}
          >
            경기 시작
          </Button>
        </section>
      ) : null}

      {isOngoing ? (
        <>
          {canEditOps ? (
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
              <div className="md:col-span-4">
                <Button type="submit" variant="outline" size="sm" disabled={pending}>
                  라운드 설정 저장
                </Button>
              </div>
            </form>
          ) : null}

          <section className="rounded-xl border p-4">
            <h2 className="font-semibold">채점심판 전송 결과</h2>
            <ScorecardsTable scorecards={scorecards} />
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
                    홍 · {match.fighterRedName}
                  </option>
                ) : null}
                {match.fighterBlueId ? (
                  <option value={match.fighterBlueId}>
                    청 · {match.fighterBlueName}
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
              defaultValue={match.displayResultMemo}
              className="border-input bg-background rounded-md border px-2 py-2 text-sm md:col-span-3"
            />
            <div className="md:col-span-3">
              <Button type="submit" disabled={pending}>
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
            <Button type="submit" variant="destructive" disabled={pending}>
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
}: {
  court: CourtJudgeCourtVM;
  matches: CourtJudgeMatchVM[];
  ongoingMatchId: string | null;
  scorecardsByMatchId: Record<string, CourtJudgeScorecardVM[]>;
}) {
  const defaultSelectedId = useMemo(
    () =>
      ongoingMatchId ??
      matches.find((m) => m.status === BracketMatchStatus.waiting)?.matchId ??
      matches[0]?.matchId ??
      null,
    [matches, ongoingMatchId],
  );

  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(defaultSelectedId);

  const activeSelectedMatchId = useMemo(() => {
    if (ongoingMatchId) return ongoingMatchId;
    if (selectedMatchId && matches.some((m) => m.matchId === selectedMatchId)) {
      return selectedMatchId;
    }
    return defaultSelectedId;
  }, [ongoingMatchId, selectedMatchId, matches, defaultSelectedId]);

  const scorecards = ongoingMatchId
    ? (scorecardsByMatchId[ongoingMatchId] ?? [])
    : [];

  return (
    <CourtJudgeIdentityGate courtId={court.courtId} role="head" roleLabel="주심판">
      {() => (
        <CourtJudgeRefreshShell>
          <CourtJudgeScreenShell
            court={court}
            matches={matches}
            ongoingMatchId={ongoingMatchId}
            roleLabel="주심판"
            selectedMatchId={activeSelectedMatchId}
            onSelectedMatchIdChange={setSelectedMatchId}
            detail={(selected) => (
              <HeadMatchDetail
                match={selected}
                ongoingMatchId={ongoingMatchId}
                scorecards={selected?.matchId === ongoingMatchId ? scorecards : []}
              />
            )}
          />
        </CourtJudgeRefreshShell>
      )}
    </CourtJudgeIdentityGate>
  );
}
