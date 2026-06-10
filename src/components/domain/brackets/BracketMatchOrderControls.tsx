"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  reorderBracketMatchFormAction,
  updateMatchOrderAndMatFormAction,
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
  const sorted = sortMatchesByOrder(allMatches);
  const idx = sorted.findIndex((m) => m.id === match.id);
  const canMoveUp = idx > 0 && !match.hasOfficialResults;
  const canMoveDown =
    idx >= 0 &&
    idx < sorted.length - 1 &&
    !match.hasOfficialResults;

  function runReorder(direction: "up" | "down") {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("matchId", match.id);
      fd.set("direction", direction);
      await reorderBracketMatchFormAction(fd);
      router.refresh();
    });
  }

  function saveDirectOrder(value: string) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("matchId", match.id);
      fd.set("globalMatchOrder", String(n));
      await updateMatchOrderAndMatFormAction(fd);
      router.refresh();
    });
  }

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center gap-1">
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
      </div>
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
        <span className="text-muted-foreground text-[10px]">순서</span>
      </div>
      {match.hasOfficialResults ? (
        <p className="text-muted-foreground text-[10px]">결과 확정 — 순서 변경 불가</p>
      ) : null}
    </div>
  );
}
