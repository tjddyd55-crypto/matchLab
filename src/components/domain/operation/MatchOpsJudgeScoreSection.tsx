"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import { Button } from "@/components/ui/button";
import { JudgeCornerScoreQuickPick } from "@/components/domain/operation/JudgeCornerScoreQuickPick";
import { MatchOpsJudgeDecisionSummary } from "@/components/domain/operation/MatchOpsJudgeDecisionSummary";
import { JudgeSlotSummaryBlock } from "@/components/domain/operation/MatchOpsJudgeUiParts";
import {
  getMatchOpsJudgeScoresAction,
  saveMatchOpsJudgeScoresAction,
} from "@/features/match-ops-judge/actions";
import { calculateJudgeDecision } from "@/lib/match-ops-judge-decision";
import {
  countManualSlotsWithInput,
  countPortalSubmitted,
  emptyRounds,
  MATCH_OPS_JUDGE_DEFAULT_SLOT_COUNT,
  parseJudgeScoreInput,
  type MatchOpsJudgePortalEntry,
  type MatchOpsJudgeSlotState,
} from "@/lib/match-ops-judge-score";
import type { MatchOpsJudgeScoreEntryVM } from "@/lib/services/match-ops-judge-score.service";
import {
  organizerOperationDetailFieldStackClass,
  organizerOperationDetailMajorSectionClass,
  organizerOperationSectionTitleClass,
} from "@/lib/ui/organizer-operation-ui";
import { cn } from "@/lib/utils";
import {
  appendOnsiteOpsToken,
  useOnsiteOpsToken,
} from "@/components/domain/onsite-ops/OnsiteOpsTokenContext";

const POLL_MS = 4000;

export type MatchOpsJudgeScoreSectionHandle = {
  saveScores: () => Promise<string | null>;
  hasDirtyScores: () => boolean;
};

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
        <span className="min-w-0 flex-1 text-sm font-bold text-[#0F172A] sm:text-base">
          {title}
        </span>
        <span className="text-muted-foreground shrink-0 text-xs sm:text-sm">
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
    <div className="space-y-3 sm:space-y-3.5">
      {rounds.map((round) => (
        <div
          key={round.roundNumber}
          className="rounded-md border border-border/60 bg-background/50 p-2.5 sm:p-3"
        >
          <p className="mb-2.5 text-sm font-bold text-[#0F172A] sm:text-base">
            {roundCount > 1 ? `${round.roundNumber}R` : "점수"}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
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
        </div>
      ))}
    </div>
  );
}

function JudgeSlotTotals({
  rounds,
  roundCount,
}: {
  rounds: MatchOpsJudgeSlotState["rounds"];
  roundCount: number;
}) {
  const computed = calculateJudgeDecision(rounds, roundCount);
  if (computed.redTotal == null || computed.blueTotal == null) return null;

  return (
    <JudgeSlotSummaryBlock
      redTotal={computed.redTotal}
      blueTotal={computed.blueTotal}
      decision={computed.decision}
      isPartial={computed.isPartial}
    />
  );
}

export const MatchOpsJudgeScoreSection = forwardRef<
  MatchOpsJudgeScoreSectionHandle,
  {
    matchId: string;
    resetKey: string;
    opsToken?: string;
    integratedSave?: boolean;
    showVoteSummary?: boolean;
  }
>(function MatchOpsJudgeScoreSection(
  {
    matchId,
    resetKey,
    opsToken: opsTokenProp,
    integratedSave = false,
    showVoteSummary = true,
  },
  ref,
) {
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
    const nextOrder =
      Math.max(manualSlotCount, ...manualSlots.map((s) => s.judgeOrder)) + 1;
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

  const saveScores = useCallback(async (): Promise<string | null> => {
    if (!entry || entry.isLocked) return null;

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
    if (!res.ok) return res.error.message;
    applyEntry(res.data);
    return null;
  }, [
    applyEntry,
    entry,
    manualSlotCount,
    manualSlots,
    matchId,
    opsToken,
  ]);

  useImperativeHandle(
    ref,
    () => ({
      saveScores,
      hasDirtyScores: () => dirtyRef.current,
    }),
    [saveScores],
  );

  function onSave() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const err = await saveScores();
      if (err) {
        setError(err);
        return;
      }
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

  if (!entry) {
    return (
      <div className={organizerOperationDetailMajorSectionClass}>
        <p className={organizerOperationSectionTitleClass}>채점심판</p>
        <p className="text-muted-foreground text-xs">채점 정보를 불러오는 중…</p>
      </div>
    );
  }

  return (
    <div className={cn(organizerOperationDetailMajorSectionClass, "space-y-3")}>
      <div className="flex items-center justify-between gap-2">
        <p className={organizerOperationSectionTitleClass}>채점심판</p>
        <p className="text-muted-foreground text-xs sm:text-sm">
          {entry.roundCount}R · 0–10점
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
                className="rounded-md border bg-background px-3 py-2.5"
              >
                <div className="mb-2.5 flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-bold text-[#0F172A] sm:text-base">
                    채점심판 {slot.judgeOrder}
                    <span className="text-muted-foreground text-xs font-medium sm:text-sm">
                      {" "}
                      · 수동입력
                    </span>
                  </p>
                  <span className="text-muted-foreground shrink-0 text-xs font-medium sm:text-sm">
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
                <JudgeSlotTotals
                  rounds={slot.rounds}
                  roundCount={entry.roundCount}
                />
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
                  className="rounded-md border bg-background px-3 py-2.5"
                >
                  <div className="mb-2.5 flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate text-sm font-bold text-[#0F172A] sm:text-base">
                      {portal.judgeName}
                    </p>
                    <span className="text-muted-foreground shrink-0 text-xs font-medium sm:text-sm">
                      {portalStatusLabel(portal.status)}
                    </span>
                  </div>
                  <JudgeRoundGrid
                    roundCount={entry.roundCount}
                    rounds={portal.rounds}
                    disabled
                    onRoundChange={() => undefined}
                  />
                  <JudgeSlotTotals
                    rounds={portal.rounds}
                    roundCount={entry.roundCount}
                  />
                </div>
              ))}
            </div>
          )}
        </CollapsibleSection>
      </div>

      {showVoteSummary ? (
        <MatchOpsJudgeDecisionSummary
          roundCount={entry.roundCount}
          manualSlots={manualSlots}
          portalEntries={portalEntries}
        />
      ) : null}

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

      {!integratedSave && !entry.isLocked ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={onSave}
          className="w-full sm:w-auto"
        >
          채점 저장
        </Button>
      ) : null}

      {entry.isLocked ? (
        <p className="text-muted-foreground text-xs">
          공식 결과가 확정되어 채점표는 읽기 전용입니다.
        </p>
      ) : integratedSave ? (
        <p className="text-muted-foreground text-[11px]">
          채점 점수는 임시저장·확정 시 함께 저장됩니다.
        </p>
      ) : null}
    </div>
  );
});
