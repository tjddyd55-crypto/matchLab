"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import { Button } from "@/components/ui/button";
import {
  getMatchOpsJudgeScoresAction,
  saveMatchOpsJudgeScoresAction,
} from "@/features/match-ops-judge/actions";
import {
  calculateJudgeScoreTotals,
  emptyRounds,
  parseJudgeScoreInput,
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

function toDrafts(entry: MatchOpsJudgeScoreEntryVM): SlotDraft[] {
  return entry.slots.map((slot) => ({ ...slot, dirty: false }));
}

function slotStatusLabel(status: MatchOpsJudgeSlotState["status"]): string {
  if (status === "submitted" || status === "revised" || status === "locked") {
    return "제출완료";
  }
  if (status === "draft") return "임시저장";
  return "미입력";
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
  const [slots, setSlots] = useState<SlotDraft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [staleNotice, setStaleNotice] = useState(false);
  const [pending, startTransition] = useTransition();
  const dirtyRef = useRef(false);
  const pausePollRef = useRef(false);

  const applyEntry = useCallback((next: MatchOpsJudgeScoreEntryVM, preserveDirty = false) => {
    setEntry(next);
    if (!preserveDirty || !dirtyRef.current) {
      setSlots(toDrafts(next));
      dirtyRef.current = false;
      setStaleNotice(false);
      return;
    }

    setSlots((prev) =>
      next.slots.map((slot) => {
        const current = prev.find((p) => p.judgeOrder === slot.judgeOrder);
        if (current?.dirty) return current;
        return { ...slot, dirty: false };
      }),
    );
    setStaleNotice(true);
  }, []);

  const load = useCallback(async () => {
    const res = await getMatchOpsJudgeScoresAction(matchId, opsToken ?? undefined);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    applyEntry(res.data, true);
  }, [applyEntry, matchId, opsToken]);

  useEffect(() => {
    setError(null);
    setSuccess(null);
    void load();
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

  function updateRound(
    judgeOrder: number,
    roundNumber: number,
    patch: { redScore?: string; blueScore?: string },
  ) {
    setSlots((prev) =>
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

  function onSave() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("matchId", matchId);
      appendOnsiteOpsToken(fd, opsToken);
      fd.set(
        "slotsJson",
        JSON.stringify(
          slots.map((slot) => ({
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

  const totals = useMemo(
    () =>
      calculateJudgeScoreTotals({
        roundCount: entry?.roundCount ?? 0,
        slots,
      }),
    [entry?.roundCount, slots],
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
    <div className={organizerOperationDetailMajorSectionClass}>
      <div className="flex items-center justify-between gap-2">
        <p className={organizerOperationSectionTitleClass}>채점심판</p>
        <p className="text-muted-foreground text-[11px]">
          {entry.roundCount}라운드 · 0–10점
        </p>
      </div>

      <div className={organizerOperationDetailFieldStackClass}>
        {slots.map((slot) => (
          <div
            key={slot.judgeOrder}
            className="rounded-lg border bg-muted/10 px-3 py-2.5"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-[#0F172A]">
                채점심판 {slot.judgeOrder}
                {slot.judgeName ? (
                  <span className="text-muted-foreground font-normal">
                    {" "}
                    · {slot.judgeName}
                  </span>
                ) : null}
              </p>
              <span className="text-muted-foreground text-[11px]">
                {slotStatusLabel(slot.status)}
              </span>
            </div>

            <div className="space-y-2">
              {slot.rounds.map((round) => (
                <div
                  key={round.roundNumber}
                  className="grid grid-cols-[44px_1fr_1fr] items-center gap-2"
                >
                  <span className="text-muted-foreground text-[11px] font-medium">
                    {entry.roundCount > 1 ? `${round.roundNumber}R` : "점수"}
                  </span>
                  <label className={organizerOperationDetailLabelControlClass}>
                    <span className={organizerOperationDetailFieldLabelClass}>
                      RED
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={round.redScore ?? ""}
                      disabled={entry.isLocked || pending}
                      onChange={(e) =>
                        updateRound(slot.judgeOrder, round.roundNumber, {
                          redScore: e.target.value,
                        })
                      }
                      className="border-input bg-background h-[34px] w-full rounded-md border px-2 text-sm"
                    />
                  </label>
                  <label className={organizerOperationDetailLabelControlClass}>
                    <span className={organizerOperationDetailFieldLabelClass}>
                      BLUE
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={round.blueScore ?? ""}
                      disabled={entry.isLocked || pending}
                      onChange={(e) =>
                        updateRound(slot.judgeOrder, round.roundNumber, {
                          blueScore: e.target.value,
                        })
                      }
                      className="border-input bg-background h-[34px] w-full rounded-md border px-2 text-sm"
                    />
                  </label>
                </div>
              ))}
            </div>

            {slot.redTotal != null && slot.blueTotal != null ? (
              <p className="text-muted-foreground mt-2 text-[11px]">
                합계 RED {slot.redTotal} · BLUE {slot.blueTotal}
              </p>
            ) : null}
          </div>
        ))}
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
                <p className={cn("text-[11px] font-semibold", matchonRedCornerTextClass)}>
                  RED
                </p>
                <p className={cn("mt-1 text-2xl font-bold tabular-nums", matchonRedCornerTextClass)}>
                  {totals.redTotal}
                </p>
              </div>
              <div>
                <p className={cn("text-[11px] font-semibold", matchonBlueCornerTextClass)}>
                  BLUE
                </p>
                <p className={cn("mt-1 text-2xl font-bold tabular-nums", matchonBlueCornerTextClass)}>
                  {totals.blueTotal}
                </p>
              </div>
            </div>
            <p className="text-muted-foreground mt-2 text-center text-[11px]">
              {totals.completedJudgeCount}명 심판 점수 합산
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
