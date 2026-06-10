"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { generateAutoBracketMatchesAction } from "@/features/brackets/actions";
import type { ActionResult } from "@/lib/action-result";
import type { AutoBracketGenerationSummary } from "@/lib/services/bracket-auto-match.service";
import { Button } from "@/components/ui/button";

type GenResult = ActionResult<AutoBracketGenerationSummary>;

function SummaryBlock({ summary }: { summary: AutoBracketGenerationSummary }) {
  return (
    <div className="mt-4 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-3 text-sm">
      <p className="font-medium text-emerald-950 dark:text-emerald-100">
        자동 대진 생성 완료
      </p>
      <ul className="mt-2 space-y-1 text-xs">
        <li>생성 경기: {summary.createdMatches}경기</li>
        <li>미매칭 선수: {summary.unmatchedCount}명</li>
        <li>처리 부문: {summary.divisionsProcessed}개</li>
        <li>기존 배치 제외: {summary.excludedAlreadyPlaced}명</li>
        {summary.ineligibleWarningCount > 0 ? (
          <li>현장·계체 미확정 포함: {summary.ineligibleWarningCount}명</li>
        ) : null}
        {summary.sameGymPairWarnings > 0 ? (
          <li>같은 체육관 매칭: {summary.sameGymPairWarnings}건</li>
        ) : null}
        {summary.createdBrackets > 0 ? (
          <li>신규 브래킷: {summary.createdBrackets}개</li>
        ) : null}
        {summary.resetDeletedMatches > 0 ? (
          <li>초기화된 기존 경기: {summary.resetDeletedMatches}건</li>
        ) : null}
      </ul>
      {summary.divisionSummaries.length > 0 ? (
        <ul className="mt-2 space-y-1 text-xs">
          {summary.divisionSummaries.map((d) => (
            <li key={d.divisionLabel}>
              {d.divisionLabel}: {d.createdMatches}경기 생성 · 미매칭{" "}
              {d.unmatchedCount}명
            </li>
          ))}
        </ul>
      ) : null}
      {summary.messages.length > 0 ? (
        <ul className="mt-2 space-y-1 text-xs text-amber-900 dark:text-amber-100">
          {summary.messages.map((m) => (
            <li key={m}>⚠ {m}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function AutoBracketGenerationPanel({
  eventId,
  canResetSafely,
  matchesWithResults,
}: {
  eventId: string;
  canResetSafely: boolean;
  matchesWithResults: number;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    generateAutoBracketMatchesAction,
    null as GenResult | null,
  );
  const [resetState, resetFormAction, resetPending] = useActionState(
    generateAutoBracketMatchesAction,
    null as GenResult | null,
  );

  const activeState = resetState ?? state;
  const isPending = pending || resetPending;

  useEffect(() => {
    if (activeState?.ok) {
      router.refresh();
    }
  }, [activeState, router]);

  const summary = activeState?.ok ? activeState.data : null;
  const errorMessage =
    activeState && !activeState.ok ? activeState.error.message : null;

  return (
    <section className="ring-foreground/10 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">자동 대진 생성</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            대진표는 신청자 기준으로 먼저 생성됩니다. 현장 확인·계체 결과는
            이후 경기 진행/패 처리에 반영할 수 있습니다.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="resetExisting" value="off" />

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="eligibleOnly"
              className="size-4 rounded border"
            />
            <span>출전 확정자만 생성 (고급)</span>
          </label>

          <Button type="submit" disabled={isPending}>
            {pending ? "생성 중…" : "자동 대진 생성"}
          </Button>
        </form>

        {canResetSafely ? (
          <form
            action={resetFormAction}
            onSubmit={(e) => {
              if (
                !window.confirm(
                  "기존 대진을 모두 초기화한 뒤 자동 생성합니다. 계속할까요?",
                )
              ) {
                e.preventDefault();
              }
            }}
          >
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="resetExisting" value="on" />
            <label className="mb-2 flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="eligibleOnly"
                className="size-4 rounded border"
              />
              <span>출전 확정자만 생성 (고급)</span>
            </label>
            <Button type="submit" variant="destructive" disabled={isPending}>
              {resetPending ? "초기화·생성 중…" : "기존 대진 초기화 후 자동 생성"}
            </Button>
          </form>
        ) : matchesWithResults > 0 ? (
          <p className="text-muted-foreground text-xs">
            결과가 입력된 경기({matchesWithResults}건)가 있어 전체 재생성을 할
            수 없습니다.
          </p>
        ) : null}
      </div>

      {errorMessage ? (
        <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}

      {summary ? <SummaryBlock summary={summary} /> : null}
    </section>
  );
}
