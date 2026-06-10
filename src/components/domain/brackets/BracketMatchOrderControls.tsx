"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  reorderBracketMatchAction,
  updateMatchOrderAndMatAction,
} from "@/features/brackets/actions";
import { Button } from "@/components/ui/button";
import type { OrganizerBracketMatchVM } from "@/lib/services/bracket.service";
import {
  formatMatchOrderShort,
  sortMatchesByOrder,
} from "@/lib/match-order-display";
import { cn } from "@/lib/utils";

export function BracketMatchOrderControls({
  match,
  allMatches,
  className,
}: {
  match: OrganizerBracketMatchVM;
  allMatches: OrganizerBracketMatchVM[];
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const sorted = sortMatchesByOrder(allMatches);
  const idx = sorted.findIndex((m) => m.id === match.id);
  const canMoveUp = idx > 0 && !match.hasOfficialResults;
  const canMoveDown =
    idx >= 0 && idx < sorted.length - 1 && !match.hasOfficialResults;

  function runReorder(direction: "up" | "down") {
    startTransition(async () => {
      setFeedback(null);
      const fd = new FormData();
      fd.set("matchId", match.id);
      fd.set("direction", direction);
      const res = await reorderBracketMatchAction(fd);
      if (res.ok) {
        setFeedback({ type: "success", message: "순서 저장됨" });
        router.refresh();
      } else {
        setFeedback({
          type: "error",
          message: res.error.message || "순서 저장 실패",
        });
      }
    });
  }

  function saveDirectOrder(value: string) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) return;
    startTransition(async () => {
      setFeedback(null);
      const fd = new FormData();
      fd.set("matchId", match.id);
      fd.set("globalMatchOrder", String(n));
      const res = await updateMatchOrderAndMatAction(fd);
      if (res.ok) {
        setFeedback({ type: "success", message: "순서 저장됨" });
        router.refresh();
      } else {
        setFeedback({
          type: "error",
          message: res.error.message || "순서 저장 실패",
        });
      }
    });
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <p className="text-muted-foreground text-[11px] font-semibold">
        경기 순서 변경
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-[3.5rem] text-sm font-semibold">
          {formatMatchOrderShort(match)}
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 w-7 px-0 text-xs"
          disabled={!canMoveUp || pending}
          onClick={() => runReorder("up")}
          aria-label="위로"
        >
          ▲
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 w-7 px-0 text-xs"
          disabled={!canMoveDown || pending}
          onClick={() => runReorder("down")}
          aria-label="아래로"
        >
          ▼
        </Button>
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={0}
            defaultValue={
              match.globalMatchOrder ?? match.matchNumber ?? match.matchOrder
            }
            className="border-input bg-background h-7 w-16 rounded-md border px-1 text-xs"
            onBlur={(e) => saveDirectOrder(e.target.value)}
            disabled={match.hasOfficialResults || pending}
          />
          <span className="text-muted-foreground text-[10px]">순서 직접 입력</span>
        </div>
      </div>
      {feedback ? (
        <p
          className={cn(
            "text-[11px] font-medium",
            feedback.type === "success"
              ? "text-emerald-700 dark:text-emerald-400"
              : "text-destructive",
          )}
        >
          {feedback.message}
        </p>
      ) : null}
      {match.hasOfficialResults ? (
        <p className="text-muted-foreground text-[10px]">
          결과 확정 — 순서 변경 불가
        </p>
      ) : null}
    </div>
  );
}
