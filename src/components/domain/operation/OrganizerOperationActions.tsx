"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateMatchStatusAction } from "@/features/matches/actions";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";
import { BracketMatchStatus } from "@/lib/enums";
import {
  canEndMatch,
  canEnterResult,
  canStartMatch,
  canViewResult,
  getStatusesForStartMatch,
} from "@/lib/match-operation-display";
import type { OrganizerEventMatchListItemVM } from "@/lib/services/match.service";
import { cn } from "@/lib/utils";

async function runAction(
  fn: () => Promise<ActionResult<{ ok: true }>>,
): Promise<string | null> {
  const res = await fn();
  if (res.ok) return null;
  return res.error.message;
}

export function OrganizerOperationActions({
  match,
  onOpenResult,
  onOpenView,
  compact,
}: {
  match: OrganizerEventMatchListItemVM;
  onOpenResult: () => void;
  onOpenView: () => void;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const blocked = match.status === BracketMatchStatus.cancelled;
  const showStart = canStartMatch(match.status);
  const showEnd = canEndMatch(match.status);
  const showResult = canEnterResult(match);
  const showView = canViewResult(match);

  const refresh = () => router.refresh();

  const runStatusUpdate = (status: BracketMatchStatus) => {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("matchId", match.matchId);
      fd.set("status", status);
      const err = await runAction(() => updateMatchStatusAction(fd));
      setError(err);
      if (!err) refresh();
    });
  };

  const handleStart = () => {
    const steps = getStatusesForStartMatch(match.status);
    if (steps.length === 0) return;

    setError(null);
    startTransition(async () => {
      for (const status of steps) {
        const fd = new FormData();
        fd.set("matchId", match.matchId);
        fd.set("status", status);
        const err = await runAction(() => updateMatchStatusAction(fd));
        if (err) {
          setError(err);
          return;
        }
      }
      refresh();
    });
  };

  const handleEnd = () => runStatusUpdate(BracketMatchStatus.finished);

  if (blocked) {
    return (
      <p className="text-muted-foreground text-xs">취소된 경기입니다.</p>
    );
  }

  return (
    <div className={cn("space-y-2", compact ? "text-xs" : "text-sm")}>
      <div className="flex flex-wrap gap-2">
        {showStart ? (
          <Button
            type="button"
            size={compact ? "xs" : "sm"}
            variant="default"
            disabled={pending}
            onClick={handleStart}
          >
            진행 시작
          </Button>
        ) : null}
        {showEnd ? (
          <Button
            type="button"
            size={compact ? "xs" : "sm"}
            variant="secondary"
            disabled={pending}
            onClick={handleEnd}
          >
            경기 종료
          </Button>
        ) : null}
        {showResult ? (
          <Button
            type="button"
            size={compact ? "xs" : "sm"}
            variant="outline"
            disabled={pending}
            onClick={onOpenResult}
          >
            결과 입력
          </Button>
        ) : null}
        {showView ? (
          <Button
            type="button"
            size={compact ? "xs" : "sm"}
            variant="outline"
            disabled={pending}
            onClick={onOpenView}
          >
            결과 보기
          </Button>
        ) : null}
      </div>
      {error ? (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
