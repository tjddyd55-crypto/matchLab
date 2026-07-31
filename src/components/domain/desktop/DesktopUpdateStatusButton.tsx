"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isMatchonDesktopClient } from "@/lib/desktop/client";
import { getDesktopUpdateDisplayState } from "@/lib/desktop/update-display";
import type { MatchonDesktopUpdateStatus } from "@/types/matchon-desktop";
import { cn } from "@/lib/utils";

/**
 * MATCHON Manager 업데이트 상태 버튼.
 * Header · /desktop/login 공통. 사용자 문구는 update-display SSOT.
 */
export function DesktopUpdateStatusButton({
  className,
}: {
  className?: string;
}) {
  const [status, setStatus] = useState<MatchonDesktopUpdateStatus | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    if (!isMatchonDesktopClient()) return;
    const bridge = window.matchonDesktop;
    if (!bridge?.getUpdateStatus) return;

    let cancelled = false;
    void bridge.getUpdateStatus().then((next) => {
      if (!cancelled) setStatus(next);
    });
    const unsubscribe = bridge.subscribeUpdateStatus?.((next) => {
      if (!cancelled) setStatus(next);
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => setFlash(null), 2200);
    return () => window.clearTimeout(t);
  }, [flash]);

  if (!status) return null;

  const display = getDesktopUpdateDisplayState(status);

  async function runCheck() {
    const next = await window.matchonDesktop?.checkForUpdates?.();
    if (next) setStatus(next);
    return next ?? null;
  }

  async function runInstall() {
    setConfirmOpen(false);
    await window.matchonDesktop?.installUpdate?.();
  }

  async function onClick() {
    const current = status;
    if (!current) return;

    if (current.state === "checking" || current.state === "downloading") {
      return;
    }

    if (current.state === "ready") {
      setConfirmOpen(true);
      return;
    }

    if (current.state === "disabled") {
      setFlash("최신 버전입니다");
      return;
    }

    if (current.state === "available") {
      return;
    }

    const next = await runCheck();
    if (
      next &&
      (next.state === "up_to_date" || next.state === "disabled")
    ) {
      setFlash("최신 버전입니다");
    }
  }

  return (
    <div className={cn("relative flex shrink-0 items-center", className)}>
      <Button
        type="button"
        size="sm"
        variant={display.emphasize ? "default" : "outline"}
        className={cn(
          "h-8 shrink-0 whitespace-nowrap px-2.5 text-xs font-semibold",
          display.emphasize && "bg-matchon-primary text-white",
        )}
        onClick={() => void onClick()}
        disabled={display.busy || !display.interactive}
        data-testid="desktop-update-button"
        title={display.tooltip ?? undefined}
        aria-label={display.label}
      >
        {display.label}
      </Button>

      {flash ? (
        <span
          role="status"
          className="pointer-events-none absolute top-full right-0 z-20 mt-1 whitespace-nowrap rounded-md border border-matchon-border bg-white px-2 py-1 text-[11px] font-medium text-matchon-text-primary shadow-sm"
        >
          {flash}
        </span>
      ) : null}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>업데이트 적용</DialogTitle>
            <DialogDescription>
              업데이트를 적용하면 프로그램이 재시작됩니다. 저장되지 않은 작업이
              있으면 먼저 저장해 주세요.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
            >
              취소
            </Button>
            <Button type="button" onClick={() => void runInstall()}>
              업데이트 적용
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
