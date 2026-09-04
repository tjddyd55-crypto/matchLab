"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { scheduleEffectStateUpdate } from "@/lib/react/schedule-effect-state-update";
import { useRouter } from "next/navigation";
import {
  clearEventMultiMatchConfirmationAction,
  confirmEventMultiMatchAction,
  listEventBracketDuplicateValidationAction,
} from "@/features/brackets/actions";
import type { BracketDuplicateAssignmentIssue } from "@/lib/brackets/bracket-duplicate-validation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function BracketDuplicateValidationDialog({
  eventId,
  open,
  onOpenChange,
}: {
  eventId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<BracketDuplicateAssignmentIssue[]>([]);
  const [unconfirmedCount, setUnconfirmedCount] = useState(0);
  const [confirmedCount, setConfirmedCount] = useState(0);

  const reload = useCallback(async () => {
    scheduleEffectStateUpdate(() => {
      setLoading(true);
      setError(null);
    });
    const res = await listEventBracketDuplicateValidationAction(eventId);
    setLoading(false);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    setIssues(res.data.issues);
    setUnconfirmedCount(res.data.unconfirmedCount);
    setConfirmedCount(res.data.confirmedCount);
  }, [eventId]);

  useEffect(() => {
    if (!open) return;
    scheduleEffectStateUpdate(() => {
      void reload();
    });
  }, [open, reload]);

  function confirmIssue(applicationId: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("eventId", eventId);
      fd.set("applicationId", applicationId);
      const res = await confirmEventMultiMatchAction(fd);
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      await reload();
      router.refresh();
    });
  }

  function clearIssue(applicationId: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("eventId", eventId);
      fd.set("applicationId", applicationId);
      const res = await clearEventMultiMatchConfirmationAction(fd);
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      await reload();
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        layout="shell"
        className="w-[min(100vw-1.5rem,40rem)] max-w-none max-h-[88dvh] sm:max-w-none"
      >
        <DialogHeader className="space-y-1">
          <DialogTitle>대진 검증</DialogTitle>
          <DialogDescription>
            대회 전체에서 2경기 이상 배정된 선수를 확인하고, 의도된 복수 출전인지
            표시합니다.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-3">
          {loading ? (
            <p className="text-muted-foreground text-sm">검사 중…</p>
          ) : null}
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}

          {!loading ? (
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-md border px-2 py-1">
                복수 출전 선수 {issues.length}명
              </span>
              <span className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-amber-950 dark:text-amber-100">
                확인 필요 {unconfirmedCount}명
              </span>
              <span className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-emerald-900 dark:text-emerald-100">
                확인 완료 {confirmedCount}명
              </span>
            </div>
          ) : null}

          {!loading && issues.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-6 text-center text-sm">
              2경기 이상 배정된 선수가 없습니다.
            </p>
          ) : null}

          <ul className="space-y-3">
            {issues.map((issue) => (
              <li
                key={issue.applicationId}
                className={cn(
                  "rounded-lg border p-3",
                  issue.confirmed
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-amber-500/40 bg-amber-500/5",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-semibold">
                      {issue.gymName} · {issue.fighterName}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {issue.matchCount}경기 배정
                      {issue.confirmed ? " · 의도된 복수 출전 확인 완료" : ""}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-medium",
                      issue.confirmed
                        ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
                        : "bg-amber-500/15 text-amber-900 dark:text-amber-100",
                    )}
                  >
                    {issue.confirmed ? "확인 완료" : "확인 필요"}
                  </span>
                </div>

                <ul className="mt-2 space-y-1 text-xs">
                  {issue.matches.map((m) => (
                    <li key={m.matchId} className="text-muted-foreground">
                      {m.matchLabel} · {m.corner} · vs {m.opponentName} ·{" "}
                      {m.divisionLabel}
                    </li>
                  ))}
                </ul>

                <div className="mt-3 flex flex-wrap gap-2">
                  {!issue.confirmed ? (
                    <Button
                      type="button"
                      size="sm"
                      disabled={pending}
                      onClick={() => confirmIssue(issue.applicationId)}
                    >
                      의도된 복수 출전으로 확인
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => clearIssue(issue.applicationId)}
                    >
                      확인 취소
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
