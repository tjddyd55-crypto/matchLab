"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { generateAutoBracketMatchesAction } from "@/features/brackets/actions";
import type { ActionResult } from "@/lib/action-result";
import { formatCourtTabLabel } from "@/lib/court-tab-label";
import type { AutoBracketGenerationSummary } from "@/lib/services/bracket-auto-match.service";
import type { EventCourtVM } from "@/lib/services/event-court.service";
import { Button } from "@/components/ui/button";

type GenResult = ActionResult<AutoBracketGenerationSummary>;

function SummaryBlock({
  summary,
  preview,
}: {
  summary: AutoBracketGenerationSummary;
  preview?: boolean;
}) {
  return (
    <div
      className={
        preview
          ? "mt-4 rounded-md border border-sky-500/40 bg-sky-500/10 px-3 py-3 text-sm"
          : "mt-4 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-3 text-sm"
      }
    >
      <p className="font-medium">
        {preview ? "자동매칭 미리보기" : "자동 대진 생성 완료"}
      </p>
      <ul className="mt-2 space-y-1 text-xs">
        <li>
          {preview ? "생성 예정" : "생성"} 경기:{" "}
          {preview
            ? (summary.plannedMatches ?? summary.createdMatches)
            : summary.createdMatches}
          경기
        </li>
        <li>미매칭 선수: {summary.unmatchedCount}명</li>
        <li>처리 경기구분: {summary.divisionsProcessed}개</li>
        {!preview ? (
          <>
            <li>기존 배치 제외: {summary.excludedAlreadyPlaced}명</li>
            {summary.createdBrackets > 0 ? (
              <li>신규 대진표 그룹: {summary.createdBrackets}개</li>
            ) : null}
          </>
        ) : null}
      </ul>
      {summary.courtAssignments && summary.courtAssignments.length > 0 ? (
        <ul className="mt-2 space-y-1 text-xs">
          <li className="font-medium">경기장별 배정</li>
          {summary.courtAssignments.map((c) => (
            <li key={c.courtLabel}>
              {c.courtLabel}: {c.assignedCount}경기
            </li>
          ))}
        </ul>
      ) : null}
      {summary.unmatchedDetails && summary.unmatchedDetails.length > 0 ? (
        <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs">
          <li className="font-medium">미매칭 상세</li>
          {summary.unmatchedDetails.slice(0, 20).map((u) => (
            <li key={`${u.fighterName}-${u.reasonLabel}`}>
              {u.fighterName} ({u.gymName}) — {u.reasonLabel}
            </li>
          ))}
          {summary.unmatchedDetails.length > 20 ? (
            <li>… 외 {summary.unmatchedDetails.length - 20}명</li>
          ) : null}
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
  courts,
  canResetSafely,
  matchesWithResults,
}: {
  eventId: string;
  courts: EventCourtVM[];
  canResetSafely: boolean;
  matchesWithResults: number;
}) {
  const router = useRouter();
  const activeCourts = courts.filter((c) => c.isActive);
  const [autoMatchScope, setAutoMatchScope] = useState<"all" | "court">("all");
  const [targetCourtId, setTargetCourtId] = useState<string>("all");
  const [maxMatchesPerCourt, setMaxMatchesPerCourt] = useState<string>("");
  const [forbidSameGym, setForbidSameGym] = useState(true);
  const [resetExisting, setResetExisting] = useState(false);

  const [previewState, previewAction, previewPending] = useActionState(
    generateAutoBracketMatchesAction,
    null as GenResult | null,
  );
  const [applyState, applyAction, applyPending] = useActionState(
    generateAutoBracketMatchesAction,
    null as GenResult | null,
  );

  const activeState = applyState ?? previewState;
  const isPending = previewPending || applyPending;

  useEffect(() => {
    if (applyState?.ok && !applyState.data.previewOnly) {
      router.refresh();
    }
  }, [applyState, router]);

  const previewSummary =
    previewState?.ok && previewState.data.previewOnly
      ? previewState.data
      : null;
  const applySummary =
    applyState?.ok && !applyState.data.previewOnly ? applyState.data : null;
  const errorMessage =
    activeState && !activeState.ok ? activeState.error.message : null;

  const effectiveTargetCourtId =
    autoMatchScope === "court" && (targetCourtId === "all" || !targetCourtId)
      ? (activeCourts[0]?.id ?? "")
      : targetCourtId;

  const displayTargetCourtId = (() => {
    if (autoMatchScope === "all") {
      return activeCourts.some((c) => c.id === targetCourtId)
        ? targetCourtId
        : "all";
    }
    if (activeCourts.some((c) => c.id === targetCourtId)) {
      return targetCourtId;
    }
    return activeCourts[0]?.id ?? "";
  })();

  const courtScopeInvalid =
    autoMatchScope === "court" &&
    (activeCourts.length === 0 || !displayTargetCourtId);

  function buildHiddenFields(previewOnly: boolean) {
    return (
      <>
        <input type="hidden" name="eventId" value={eventId} />
        <input type="hidden" name="previewOnly" value={previewOnly ? "on" : "off"} />
        <input type="hidden" name="autoMatchScope" value={autoMatchScope} />
        <input
          type="hidden"
          name="targetCourtId"
          value={effectiveTargetCourtId}
        />
        <input type="hidden" name="maxMatchesPerCourt" value={maxMatchesPerCourt} />
        <input type="hidden" name="forbidSameGym" value={forbidSameGym ? "on" : "off"} />
        <input type="hidden" name="preserveManualCourts" value="on" />
        <input type="hidden" name="resetExisting" value={resetExisting ? "on" : "off"} />
      </>
    );
  }

  return (
    <section className="ring-foreground/10 rounded-xl border bg-card p-4 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold">자동매칭</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          미리보기로 결과를 확인한 뒤 적용하세요. 같은 체육관끼리 매칭 금지가
          기본 적용됩니다.
        </p>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">자동매칭 범위</span>
          <select
            className="border-input bg-background h-9 rounded-md border px-2 text-sm"
            value={autoMatchScope}
            onChange={(e) => {
              const nextScope = e.target.value as "all" | "court";
              setAutoMatchScope(nextScope);
              if (nextScope === "court") {
                setTargetCourtId((prev) =>
                  prev === "all" || !prev
                    ? (activeCourts[0]?.id ?? "all")
                    : prev,
                );
              }
            }}
          >
            <option value="all">전체 자동매칭</option>
            <option value="court">특정 경기장만 자동매칭</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">대상 경기장</span>
          <select
            className="border-input bg-background h-9 rounded-md border px-2 text-sm"
            value={displayTargetCourtId}
            onChange={(e) => setTargetCourtId(e.target.value)}
            disabled={activeCourts.length === 0}
          >
            {autoMatchScope === "all" ? (
              <option value="all">전체 활성 경기장에 분산</option>
            ) : null}
            {activeCourts.map((c, idx) => (
              <option key={c.id} value={c.id}>
                {formatCourtTabLabel(c, idx)}
              </option>
            ))}
          </select>
          {activeCourts.length === 0 ? (
            <span className="text-destructive text-xs">
              활성 경기장이 없습니다. 기본설정에서 경기장을 먼저 생성해 주세요.
            </span>
          ) : courtScopeInvalid ? (
            <span className="text-destructive text-xs">
              특정 경기장 자동매칭은 대상 경기장을 선택해 주세요.
            </span>
          ) : null}
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">경기장당 최대 경기 수</span>
          <input
            type="number"
            min={1}
            placeholder="제한 없음"
            className="border-input bg-background h-9 rounded-md border px-2 text-sm"
            value={maxMatchesPerCourt}
            onChange={(e) => setMaxMatchesPerCourt(e.target.value)}
          />
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={forbidSameGym}
            onChange={(e) => setForbidSameGym(e.target.checked)}
          />
          <span>같은 체육관끼리 매칭 금지 (기본 ON)</span>
        </label>
      </div>

      <p className="text-muted-foreground mt-3 text-xs">
        기존 수동 지정 경기장은 덮어쓰지 않습니다. 전체 재생성은 결과 입력
        전에만 가능합니다.
      </p>

      {canResetSafely ? (
        <label className="mt-2 flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={resetExisting}
            onChange={(e) => setResetExisting(e.target.checked)}
          />
          적용 시 기존 대진 초기화 후 생성 (유지/재생성)
        </label>
      ) : matchesWithResults > 0 ? (
        <p className="text-muted-foreground mt-2 text-xs">
          결과 입력 경기({matchesWithResults}건)가 있어 전체 재생성은
          불가합니다. 기존 매칭은 유지됩니다.
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <form action={previewAction}>
          {buildHiddenFields(true)}
          <Button
            type="submit"
            variant="outline"
            disabled={isPending || activeCourts.length === 0 || courtScopeInvalid}
          >
            {previewPending ? "미리보기 중…" : "미리보기"}
          </Button>
        </form>
        <form
          action={applyAction}
          onSubmit={(e) => {
            if (activeCourts.length === 0 || courtScopeInvalid) {
              e.preventDefault();
              return;
            }
            if (
              resetExisting &&
              !window.confirm(
                "기존 대진을 초기화한 뒤 자동매칭을 적용합니다. 계속할까요?",
              )
            ) {
              e.preventDefault();
            }
          }}
        >
          {buildHiddenFields(false)}
          <Button
            type="submit"
            disabled={isPending || activeCourts.length === 0 || courtScopeInvalid}
          >
            {applyPending ? "적용 중…" : "적용"}
          </Button>
        </form>
      </div>

      {errorMessage ? (
        <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}

      {previewSummary ? <SummaryBlock summary={previewSummary} preview /> : null}
      {applySummary ? <SummaryBlock summary={applySummary} /> : null}
    </section>
  );
}
