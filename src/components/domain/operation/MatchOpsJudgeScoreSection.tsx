"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import { Button } from "@/components/ui/button";
import { JudgeCornerScoreQuickPick } from "@/components/domain/operation/JudgeCornerScoreQuickPick";
import {
  getMatchOpsJudgeScoresAction,
  saveMatchOpsJudgeScoresAction,
} from "@/features/match-ops-judge/actions";
import {
  calculateJudgeScoreTotals,
  countManualSlotsWithInput,
  countPortalSubmitted,
  emptyRounds,
  MATCH_OPS_JUDGE_DEFAULT_SLOT_COUNT,
  parseJudgeScoreInput,
  type MatchOpsJudgePortalEntry,
  type MatchOpsJudgeSlotState,
} from "@/lib/match-ops-judge-score";
import {
  matchonBlueCornerTextClass,
  matchonRedCornerTextClass,
} from "@/lib/ui/judge-ui";
import type { MatchOpsJudgeScoreEntryVM } from "@/lib/services/match-ops-judge-score.service";
import {
  organizerOperationDetailFieldLabelClass,
  organizerOperationDetailFieldStackClass,
  organizerOperationDetailLabelControlClass,
  organizerOperationDetailMajorSectionClass,
  organizerOperationSectionTitleClass,
} from "@/lib/ui/organizer-operation-ui";
import { cn } from "@/lib/utils";
import {
  appendOnsiteOpsToken,
  useOnsiteOpsToken,
} from "@/components/domain/onsite-ops/OnsiteOpsTokenContext";

const POLL_MS = 4000;

type SlotDraft = MatchOpsJudgeSlotState & {
  dirty: boolean;
};

function toManualDrafts(entry: MatchOpsJudgeScoreEntryVM): SlotDraft[] {
  return entry.manualSlots.map((slot) => ({ ...slot, dirty: false }));
}

function slotStatusLabel(status: MatchOpsJudgeSlotState["status"]): string {
  if (status === "submitted" || status === "revised" || status === "locked") {
    return "제출완료";
  }
  if (status === "draft") return "임시저장";
  return "미입력";
}

function portalStatusLabel(status: MatchOpsJudgePortalEntry["status"]): string {
  if (status === "submitted" || status === "revised" || status === "locked") {
    return "제출완료";
  }
  if (status === "draft") return "임시저장";
  return "미입력";
}

type CollapsibleSectionProps = {
  title: string;
  summary: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
};

function CollapsibleSection({
  title,
  summary,
  expanded,
  onToggle,
  children,
}: CollapsibleSectionProps) {
  const Chevron = expanded ? ChevronDown : ChevronRight;
  return (
    <div className="rounded-lg border bg-muted/10">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
        aria-expanded={expanded}
      >
        <Chevron className="text-muted-foreground size-4 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1 text-xs font-semibold text-[#0F172A]">
          {title}
        </span>
        <span className="text-muted-foreground shrink-0 text-[11px]">
          {summary}
        </span>
      </button>
      {expanded ? (
        <div className="space-y-2 border-t px-3 pb-3 pt-2">{children}</div>
      ) : null}
    </div>
  );
}

function JudgeRoundGrid({
  roundCount,
  rounds,
  disabled,
  onRoundChange,
}: {
  roundCount: number;
  rounds: MatchOpsJudgeSlotState["rounds"];
  disabled: boolean;
  onRoundChange: (
    roundNumber: number,
    patch: { redScore?: string; blueScore?: string },
  ) => void;
}) {
  return (
    <div className="space-y-3">
      {rounds.map((round) => (
        <div key={round.roundNumber} className="space-y-2">
          <p className="text-muted-foreground text-[11px] font-medium">
            {roundCount > 1 ? `${round.roundNumber}R` : "점수"}
          </p>
          <JudgeCornerScoreQuickPick
            corner="RED"
            value={round.redScore}
            disabled={disabled}
            onChange={(next) =>
              onRoundChange(round.roundNumber, {
                redScore: next == null ? "" : String(next),
              })
            }
          />
          <JudgeCornerScoreQuickPick
            corner="BLUE"
            value={round.blueScore}
            disabled={disabled}
            onChange={(next) =>
              onRoundChange(round.roundNumber, {
                blueScore: next == null ? "" : String(next),
              })
            }
          />
        </div>
      ))}
    </div>
  );
}

export function MatchOpsJudgeScoreSection({
  matchId,
  resetKey,
  opsToken: opsTokenProp,
}: {
  matchId: string;
  resetKey: string;
  opsToken?: string;
}) {
  const contextOpsToken = useOnsiteOpsToken();
  const opsToken = opsTokenProp ?? contextOpsToken;
  const [entry, setEntry] = useState<MatchOpsJudgeScoreEntryVM | null>(null);
  const [manualSlots, setManualSlots] = useState<SlotDraft[]>([]);
  const [portalEntries, setPortalEntries] = useState<MatchOpsJudgePortalEntry[]>(
    [],
  );
  const [manualSlotCount, setManualSlotCount] = useState(
    MATCH_OPS_JUDGE_DEFAULT_SLOT_COUNT,
  );
  const [manualExpanded, setManualExpanded] = useState(true);
  const [portalExpanded, setPortalExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [staleNotice, setStaleNotice] = useState(false);
  const [pending, startTransition] = useTransition();
  const dirtyRef = useRef(false);
  const pausePollRef = useRef(false);
  const portalInitRef = useRef(false);

  const applyEntry = useCallback(
    (next: MatchOpsJudgeScoreEntryVM, preserveDirty = false) => {
      setEntry(next);
      setPortalEntries(next.portalEntries);
      setManualSlotCount(next.manualSlotCount);

      if (!portalInitRef.current) {
        setPortalExpanded(next.portalEntries.length > 0);
        portalInitRef.current = true;
      }

      if (!preserveDirty || !dirtyRef.current) {
        setManualSlots(toManualDrafts(next));
        dirtyRef.current = false;
        setStaleNotice(false);
        return;
      }

      setManualSlots((prev) => {
        const nextOrders = new Set(next.manualSlots.map((s) => s.judgeOrder));
        const preserved = prev.filter((slot) => nextOrders.has(slot.judgeOrder));
        const merged = next.manualSlots.map((slot) => {
          const current = preserved.find((p) => p.judgeOrder === slot.judgeOrder);
          if (current?.dirty) return current;
          return { ...slot, dirty: false };
        });
        for (const slot of preserved) {
          if (!nextOrders.has(slot.judgeOrder) && slot.dirty) {
            merged.push(slot);
          }
        }
        return merged.sort((a, b) => a.judgeOrder - b.judgeOrder);
      });
      setStaleNotice(true);
    },
    [],
  );

  const load = useCallback(async () => {
    const res = await getMatchOpsJudgeScoresAction(matchId, opsToken ?? undefined);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    applyEntry(res.data, true);
  }, [applyEntry, matchId, opsToken]);

  useEffect(() => {
    portalInitRef.current = false;
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load, resetKey]);

  useEffect(() => {
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement
      ) {
        pausePollRef.current = true;
      }
    };
    const onFocusOut = () => {
      window.setTimeout(() => {
        const active = document.activeElement;
        if (
          !(
            active instanceof HTMLInputElement ||
            active instanceof HTMLTextAreaElement
          )
        ) {
          pausePollRef.current = false;
        }
      }, 120);
    };
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (pausePollRef.current || dirtyRef.current) return;
      void load();
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  function updateManualRound(
    judgeOrder: number,
    roundNumber: number,
    patch: { redScore?: string; blueScore?: string },
  ) {
    setManualSlots((prev) =>
      prev.map((slot) => {
        if (slot.judgeOrder !== judgeOrder) return slot;
        return {
          ...slot,
          dirty: true,
          rounds: slot.rounds.map((round) => {
            if (round.roundNumber !== roundNumber) return round;
            return {
              ...round,
              redScore:
                patch.redScore !== undefined
                  ? parseJudgeScoreInput(patch.redScore)
                  : round.redScore,
              blueScore:
                patch.blueScore !== undefined
                  ? parseJudgeScoreInput(patch.blueScore)
                  : round.blueScore,
            };
          }),
        };
      }),
    );
    dirtyRef.current = true;
    setStaleNotice(false);
    setError(null);
    setSuccess(null);
  }

  function addManualSlot() {
    const nextOrder = Math.max(manualSlotCount, ...manualSlots.map((s) => s.judgeOrder)) + 1;
    const roundCount = entry?.roundCount ?? MATCH_OPS_JUDGE_DEFAULT_SLOT_COUNT;
    setManualSlotCount(nextOrder);
    setManualSlots((prev) => [
      ...prev,
      {
        judgeOrder: nextOrder,
        credentialId: null,
        judgeName: null,
        status: "none",
        updatedAt: null,
        redTotal: null,
        blueTotal: null,
        rounds: emptyRounds(roundCount),
        dirty: false,
      },
    ]);
    setManualExpanded(true);
  }

  function onSave() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("matchId", matchId);
      appendOnsiteOpsToken(fd, opsToken);
      fd.set("manualSlotCount", String(manualSlotCount));
      fd.set(
        "slotsJson",
        JSON.stringify(
          manualSlots.map((slot) => ({
            judgeOrder: slot.judgeOrder,
            credentialId: slot.credentialId,
            updatedAt: slot.updatedAt,
            rounds: slot.rounds,
          })),
        ),
      );
      const res = await saveMatchOpsJudgeScoresAction(fd);
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      applyEntry(res.data);
      setSuccess("채점심판 점수가 저장되었습니다.");
    });
  }

  const manualInputCount = useMemo(
    () => countManualSlotsWithInput(manualSlots),
    [manualSlots],
  );

  const portalSubmittedCount = useMemo(
    () => countPortalSubmitted(portalEntries),
    [portalEntries],
  );

  const totals = useMemo(
    () =>
      calculateJudgeScoreTotals({
        roundCount: entry?.roundCount ?? 0,
        manualSlots,
        portalEntries,
      }),
    [entry?.roundCount, manualSlots, portalEntries],
  );

  if (!entry) {
    return (
      <div className={organizerOperationDetailMajorSectionClass}>
        <p className={organizerOperationSectionTitleClass}>채점심판</p>
        <p className="text-muted-foreground text-xs">채점 정보를 불러오는 중…</p>
      </div>
    );
  }

  return (
    <div className={cn(organizerOperationDetailMajorSectionClass, "space-y-4")}>
      <div className="flex items-center justify-between gap-2">
        <p className={organizerOperationSectionTitleClass}>채점심판</p>
        <p className="text-muted-foreground text-[11px]">
          {entry.roundCount}라운드 · 0–10점
        </p>
      </div>

      <div className={cn(organizerOperationDetailFieldStackClass, "gap-3")}>
        <CollapsibleSection
          title="수동 채점심판"
          summary={`${manualInputCount}명 입력`}
          expanded={manualExpanded}
          onToggle={() => setManualExpanded((v) => !v)}
        >
          <div className="space-y-2">
            {manualSlots.map((slot) => (
              <div
                key={slot.judgeOrder}
                className="rounded-md border bg-background px-2.5 py-2"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-xs font-semibold text-[#0F172A]">
                    채점심판 {slot.judgeOrder}
                    <span className="text-muted-foreground font-normal">
                      {" "}
                      · 수동입력
                    </span>
                  </p>
                  <span className="text-muted-foreground shrink-0 text-[11px]">
                    {slotStatusLabel(slot.status)}
                  </span>
                </div>
                <JudgeRoundGrid
                  roundCount={entry.roundCount}
                  rounds={slot.rounds}
                  disabled={entry.isLocked || pending}
                  onRoundChange={(roundNumber, patch) =>
                    updateManualRound(slot.judgeOrder, roundNumber, patch)
                  }
                />
                {slot.redTotal != null && slot.blueTotal != null ? (
                  <p className="text-muted-foreground mt-2 text-[11px]">
                    합계 RED {slot.redTotal} · BLUE {slot.blueTotal}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
          {!entry.isLocked ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 w-full text-xs"
              onClick={addManualSlot}
            >
              수동 채점심판 추가
            </Button>
          ) : null}
        </CollapsibleSection>

        <CollapsibleSection
          title="실제 심판"
          summary={`${portalEntries.length}명 · ${portalSubmittedCount}명 제출`}
          expanded={portalExpanded}
          onToggle={() => setPortalExpanded((v) => !v)}
        >
          {portalEntries.length === 0 ? (
            <p className="text-muted-foreground text-xs">
              Judge Portal에서 제출된 채점이 없습니다.
            </p>
          ) : (
            <div className="space-y-2">
              {portalEntries.map((portal) => (
                <div
                  key={portal.credentialId}
                  className="rounded-md border bg-background px-2.5 py-2"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate text-xs font-semibold text-[#0F172A]">
                      {portal.judgeName}
                    </p>
                    <span className="text-muted-foreground shrink-0 text-[11px]">
                      {portalStatusLabel(portal.status)}
                    </span>
                  </div>
                  <p className="text-muted-foreground mb-2 text-[11px]">
                    심판직접입력
                  </p>
                  <JudgeRoundGrid
                    roundCount={entry.roundCount}
                    rounds={portal.rounds}
                    disabled
                    onRoundChange={() => undefined}
                  />
                  {portal.redTotal != null && portal.blueTotal != null ? (
                    <p className="text-muted-foreground mt-2 text-[11px]">
                      합계 RED {portal.redTotal} · BLUE {portal.blueTotal}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CollapsibleSection>
      </div>

      <div className="rounded-lg border bg-muted/20 px-3 py-3">
        <p className="text-xs font-semibold text-[#0F172A]">최종 합계</p>
        {totals.completedJudgeCount === 0 ? (
          <p className="text-muted-foreground mt-2 text-xs">
            아직 입력된 채점 결과가 없습니다.
          </p>
        ) : (
          <>
            <div className="mt-2 grid grid-cols-2 gap-3 text-center">
              <div>
                <p
                  className={cn(
                    "text-[11px] font-semibold",
                    matchonRedCornerTextClass,
                  )}
                >
                  RED
                </p>
                <p
                  className={cn(
                    "mt-1 text-2xl font-bold tabular-nums",
                    matchonRedCornerTextClass,
                  )}
                >
                  {totals.redTotal}
                </p>
              </div>
              <div>
                <p
                  className={cn(
                    "text-[11px] font-semibold",
                    matchonBlueCornerTextClass,
                  )}
                >
                  BLUE
                </p>
                <p
                  className={cn(
                    "mt-1 text-2xl font-bold tabular-nums",
                    matchonBlueCornerTextClass,
                  )}
                >
                  {totals.blueTotal}
                </p>
              </div>
            </div>
            <p className="text-muted-foreground mt-2 text-center text-[11px]">
              수동 {totals.manualCompletedCount}명 · Portal{" "}
              {totals.portalCompletedCount}명 합산
              {totals.isTie ? " · 동점" : ""}
            </p>
          </>
        )}
      </div>

      {staleNotice ? (
        <FeedbackMessage tone="info">
          심판 입력이 새로 들어왔습니다. 저장하지 않은 변경은 유지됩니다.
          <button
            type="button"
            className="ml-2 underline"
            onClick={() => void load()}
          >
            최신 값 불러오기
          </button>
        </FeedbackMessage>
      ) : null}

      {error ? (
        <FeedbackMessage tone="error" role="alert">
          {error}
        </FeedbackMessage>
      ) : null}
      {success ? (
        <FeedbackMessage tone="success">{success}</FeedbackMessage>
      ) : null}

      {!entry.isLocked ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={onSave}
          className={cn("w-full sm:w-auto")}
        >
          채점 저장
        </Button>
      ) : (
        <p className="text-muted-foreground text-xs">
          공식 결과가 확정되어 채점표는 읽기 전용입니다.
        </p>
      )}
    </div>
  );
}
