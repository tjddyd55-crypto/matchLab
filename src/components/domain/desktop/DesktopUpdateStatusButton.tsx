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
import type { MatchonDesktopUpdateStatus } from "@/types/matchon-desktop";
import { cn } from "@/lib/utils";

function labelFor(status: MatchonDesktopUpdateStatus): string {
  switch (status.state) {
    case "disabled":
      return "업데이트 준비";
    case "checking":
      return "확인 중…";
    case "downloading": {
      const p =
        typeof status.progressPercent === "number"
          ? Math.max(0, Math.min(100, Math.round(status.progressPercent)))
          : null;
      return p == null ? "다운로드 중…" : `다운로드 중 ${p}%`;
    }
    case "available":
      return "업데이트 확인";
    case "ready":
      return "업데이트 적용";
    case "up_to_date":
      return "최신 버전";
    case "error":
      return "다시 시도";
    case "idle":
    default:
      return "업데이트 확인";
  }
}

/**
 * MATCHON Manager 상단 업데이트 버튼 — Electron bridge 상태 SSOT.
 * 웹에서는 렌더하지 않는다.
 */
export function DesktopUpdateStatusButton({
  className,
}: {
  className?: string;
}) {
  const [status, setStatus] = useState<MatchonDesktopUpdateStatus | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

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

  if (!status) return null;

  async function runCheck() {
    await window.matchonDesktop?.checkForUpdates?.();
  }

  async function runInstall() {
    setConfirmOpen(false);
    await window.matchonDesktop?.installUpdate?.();
  }

  async function onClick() {
    const current = status;
    if (!current) return;
    setHint(null);

    if (current.state === "disabled") {
      setHint(current.message ?? "업데이트 기능이 아직 연결되지 않았습니다.");
      return;
    }

    if (current.state === "ready") {
      setConfirmOpen(true);
      return;
    }

    if (current.state === "checking" || current.state === "downloading") {
      setHint(
        current.state === "downloading"
          ? "다운로드가 진행 중입니다."
          : "업데이트를 확인하는 중입니다.",
      );
      return;
    }

    if (current.state === "up_to_date") {
      setHint("최신 버전입니다.");
      return;
    }

    await runCheck();
  }

  const busy =
    status.state === "checking" || status.state === "downloading";

  return (
    <div className={cn("flex flex-col items-end gap-1", className)}>
      <Button
        type="button"
        size="sm"
        variant={status.state === "ready" ? "default" : "outline"}
        className={cn(
          "h-8 px-2.5 text-xs font-semibold",
          status.state === "ready" && "bg-matchon-primary text-white",
        )}
        onClick={() => void onClick()}
        disabled={busy}
        data-testid="desktop-update-button"
        title={`현재 v${status.currentVersion}${
          status.availableVersion ? ` → v${status.availableVersion}` : ""
        }`}
      >
        {labelFor(status)}
      </Button>
      {hint ? (
        <span className="max-w-[14rem] text-right text-[0.65rem] text-matchon-text-secondary">
          {hint}
        </span>
      ) : null}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
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
              적용하고 재시작
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
