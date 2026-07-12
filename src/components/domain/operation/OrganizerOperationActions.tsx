"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import { updateMatchStatusAction } from "@/features/matches/actions";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";
import { BracketMatchStatus } from "@/lib/enums";
import {
  canEndMatch,
  canEnterResult,
  canPrepareMatch,
  canStartMatch,
  canViewResult,
  getNextStatusForOperationStart,
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
  compact,
  onOpenResult,
  onOpenView,
}: {
  match: OrganizerEventMatchListItemVM;
  compact?: boolean;
  onOpenResult?: () => void;
  onOpenView?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const blocked = match.status === BracketMatchStatus.cancelled;
  const showPrepare = canPrepareMatch(match.status);
  const showStart = canStartMatch(match.status);
  const showEnd = canEndMatch(match.status);
  const showResult = canEnterResult(match);
  const showView = canViewResult(match);
  const showOpsToggle = showResult || showView;
  const externalToggle = showResult ? onOpenResult : onOpenView;

  const refresh = () => router.refresh();

  const runStatusUpdate = (status: BracketMatchStatus, successMessage: string) => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("matchId", match.matchId);
      fd.set("status", status);
      const err = await runAction(() => updateMatchStatusAction(fd));
      setError(err);
      if (!err) {
        setSuccess(successMessage);
        refresh();
      }
    });
  };

  const handleAdvance = () => {
    const next = getNextStatusForOperationStart(match.status);
    if (!next) return;
    const message =
      next === BracketMatchStatus.called
        ? "경기준비 상태로 변경되었습니다."
        : "경기가 시작되었습니다.";
    runStatusUpdate(next, message);
  };

  const handleEnd = () =>
    runStatusUpdate(BracketMatchStatus.finished, "경기가 종료되었습니다.");

  const btnSize = compact ? "xs" : "sm";

  if (blocked) {
    return (
      <p className="text-muted-foreground text-xs">취소된 경기입니다.</p>
    );
  }

  return (
    <div className={cn("space-y-2", compact ? "text-xs" : "text-sm")}>
      <div className={cn("flex flex-wrap gap-2", compact && "justify-center")}>
        {showPrepare ? (
          <Button
            type="button"
            size={btnSize}
            variant="outline"
            disabled={pending}
            onClick={handleAdvance}
          >
            경기 준비
          </Button>
        ) : null}
        {showStart && !showPrepare ? (
          <Button
            type="button"
            size={btnSize}
            variant="default"
            disabled={pending}
            onClick={handleAdvance}
          >
            경기 시작
          </Button>
        ) : null}
        {showEnd ? (
          <Button
            type="button"
            size={btnSize}
            variant="secondary"
            disabled={pending}
            onClick={handleEnd}
          >
            경기 종료
          </Button>
        ) : null}
        {showOpsToggle ? (
          <Button
            type="button"
            size={btnSize}
            variant="outline"
            disabled={pending}
            onClick={() => externalToggle?.()}
          >
            {showResult ? "결과 입력" : "결과 보기"}
          </Button>
        ) : null}
      </div>
      {error ? (
        <FeedbackMessage tone="error" role="alert">
          {error}
        </FeedbackMessage>
      ) : null}
      {success ? (
        <FeedbackMessage tone="success">{success}</FeedbackMessage>
      ) : null}
    </div>
  );
}
