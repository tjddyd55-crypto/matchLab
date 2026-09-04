"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
} from "react";
import { scheduleEffectStateUpdate } from "@/lib/react/schedule-effect-state-update";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { saveMatchScheduleFormAction } from "@/features/event-courts/actions";
import {
  clampCourtReorderPosition,
  computeCourtOrderUpdates,
  type CourtScheduleMatch,
} from "@/lib/court-match-order";
import { cn } from "@/lib/utils";

const selectClass =
  "border-input bg-background h-10 rounded-md border px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export type CourtScheduleReorderMatch = CourtScheduleMatch & {
  hasOfficialResults?: boolean;
  matchNumber?: number | null;
};

/**
 * 대진표 보기 / 전체 경기 편집 공통 — 경기장 내 ↑↓·숫자 입력 reorder.
 * 저장은 saveMatchScheduleFormAction → updateMatchSchedule(courtOrder + matchNumber) 단일 경로.
 */
export function CourtScheduleMatchReorderControls({
  eventId,
  matchId,
  courtId,
  allMatches,
  courtMatches,
  disabled = false,
  compact = false,
  className,
  onResult,
}: {
  eventId: string;
  matchId: string;
  courtId: string;
  allMatches: CourtScheduleReorderMatch[];
  /** 해당 경기장 경기 — courtOrder 오름차순 */
  courtMatches: CourtScheduleReorderMatch[];
  disabled?: boolean;
  compact?: boolean;
  className?: string;
  onResult?: (result: {
    ok: boolean;
    message: string;
  }) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const commitGuardRef = useRef(false);
  const courtIdx = courtMatches.findIndex((m) => m.matchId === matchId);
  const current = courtIdx >= 0 ? courtMatches[courtIdx] : undefined;
  const currentPosition = courtIdx >= 0 ? courtIdx + 1 : 1;
  const displayNumber =
    current?.matchNumber != null ? current.matchNumber : currentPosition;
  const [draft, setDraft] = useState(String(displayNumber));

  useEffect(() => {
    scheduleEffectStateUpdate(() => {
      setDraft(String(displayNumber));
    });
  }, [displayNumber, matchId]);

  const locked =
    disabled ||
    pending ||
    courtIdx < 0 ||
    Boolean(current?.hasOfficialResults);

  function resolveTargetCourtPosition(raw: number): number {
    const numbers = courtMatches.map((m) => m.matchNumber);
    const allNumbered = numbers.every(
      (n): n is number => n != null && Number.isFinite(n),
    );
    if (allNumbered) {
      const idxByNumber = courtMatches.findIndex((m) => m.matchNumber === raw);
      if (idxByNumber >= 0) return idxByNumber + 1;
      if (raw >= 1 && raw <= courtMatches.length) {
        return raw;
      }
      const min = Math.min(...(numbers as number[]));
      const max = Math.max(...(numbers as number[]));
      const clampedToRange = Math.min(max, Math.max(min, raw));
      const idx = courtMatches.findIndex(
        (m) => m.matchNumber === clampedToRange,
      );
      if (idx >= 0) return idx + 1;
    }
    return clampCourtReorderPosition(raw, courtMatches.length);
  }

  function persistUpdates(
    updates: Array<{
      matchId: string;
      courtId: string | null;
      courtOrder: number | null;
    }>,
  ) {
    if (updates.length === 0) {
      commitGuardRef.current = false;
      return;
    }
    const fd = new FormData();
    fd.set("eventId", eventId);
    fd.set("updates", JSON.stringify(updates));
    startTransition(async () => {
      try {
        const res = await saveMatchScheduleFormAction(fd);
        if (!res.ok) {
          onResult?.({ ok: false, message: res.error.message });
          setDraft(String(displayNumber));
          return;
        }
        onResult?.({ ok: true, message: "순서가 저장되었습니다." });
        router.refresh();
      } finally {
        commitGuardRef.current = false;
      }
    });
  }

  function moveToCourtPosition(targetPosition: number) {
    if (locked || !courtId) {
      commitGuardRef.current = false;
      return;
    }
    const clamped = clampCourtReorderPosition(
      targetPosition,
      courtMatches.length,
    );
    if (clamped === currentPosition) {
      setDraft(String(displayNumber));
      commitGuardRef.current = false;
      return;
    }

    const updates = computeCourtOrderUpdates({
      allMatches,
      movingMatchId: matchId,
      targetCourtId: courtId,
      targetPosition: clamped,
    });
    persistUpdates(updates);
  }

  function moveBy(direction: -1 | 1) {
    if (commitGuardRef.current || locked) return;
    commitGuardRef.current = true;
    moveToCourtPosition(currentPosition + direction);
  }

  function commitValue(rawInput: string) {
    if (commitGuardRef.current || locked) return;
    const trimmed = rawInput.trim();
    if (!trimmed) {
      setDraft(String(displayNumber));
      return;
    }
    const n = Number(trimmed);
    if (!Number.isFinite(n) || !Number.isInteger(n)) {
      setDraft(String(displayNumber));
      onResult?.({
        ok: false,
        message: "경기 순서는 숫자로 입력해 주세요.",
      });
      return;
    }
    if (n === displayNumber) {
      setDraft(String(displayNumber));
      return;
    }
    commitGuardRef.current = true;
    moveToCourtPosition(resolveTargetCourtPosition(n));
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitValue(e.currentTarget.value);
    } else if (e.key === "Escape") {
      setDraft(String(displayNumber));
      e.currentTarget.blur();
    }
  }

  const maxInput = (() => {
    const numbers = courtMatches
      .map((m) => m.matchNumber)
      .filter((n): n is number => n != null && Number.isFinite(n));
    if (numbers.length === courtMatches.length && numbers.length > 0) {
      return Math.max(...numbers);
    }
    return Math.max(1, courtMatches.length);
  })();

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <input
        type="number"
        min={1}
        max={maxInput}
        aria-label="경기 순서"
        className={cn(selectClass, compact ? "h-10 w-16 text-xs" : "w-20")}
        value={draft}
        disabled={locked}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => commitValue(e.currentTarget.value)}
        onKeyDown={onKeyDown}
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={cn(
          "shrink-0 p-0 font-bold disabled:opacity-40",
          compact ? "h-10 w-10 text-base" : "h-9 w-9 text-sm",
        )}
        aria-label="위로 이동"
        disabled={locked || courtIdx <= 0}
        onClick={() => moveBy(-1)}
      >
        ↑
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={cn(
          "shrink-0 p-0 font-bold disabled:opacity-40",
          compact ? "h-10 w-10 text-base" : "h-9 w-9 text-sm",
        )}
        aria-label="아래로 이동"
        disabled={locked || courtIdx >= courtMatches.length - 1}
        onClick={() => moveBy(1)}
      >
        ↓
      </Button>
    </div>
  );
}
