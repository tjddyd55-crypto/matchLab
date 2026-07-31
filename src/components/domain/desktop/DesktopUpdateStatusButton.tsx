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

/** 사용자에게 보여줄 짧은 라벨. 환경변수·내부 키 이름은 절대 노출하지 않는다. */
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

function sanitizeUserMessage(raw: string | null | undefined): string {
  if (!raw) return "업데이트를 사용할 수 없습니다.";
  if (/MATCHON_|process\.env|FEED_URL|secret|token/i.test(raw)) {
    return "최신 버전 확인이 준비되지 않았습니다.";
  }
  return raw;
}

/**
 * MATCHON Manager 상단 업데이트 버튼 — Electron bridge 상태 SSOT.
 * 웹에서는 렌더하지 않는다. 헤더는 한 줄 정렬을 유지한다.
 */
export function DesktopUpdateStatusButton({
  className,
}: {
  className?: string;
}) {
  const [status, setStatus] = useState<MatchonDesktopUpdateStatus | null>(null);
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

    if (current.state === "disabled") {
      // 상세는 title/tooltip 만 — 헤더에 환경변수 문구를 펼치지 않는다.
      return;
    }

    if (current.state === "ready") {
      setConfirmOpen(true);
      return;
    }

    if (current.state === "checking" || current.state === "downloading") {
      return;
    }

    if (current.state === "up_to_date") {
      return;
    }

    await runCheck();
  }

  const busy =
    status.state === "checking" || status.state === "downloading";

  const tooltip =
    status.state === "disabled"
      ? sanitizeUserMessage(status.message)
      : `현재 v${status.currentVersion}${
          status.availableVersion ? ` → v${status.availableVersion}` : ""
        }`;

  return (
    <div className={cn("flex items-center", className)}>
      <Button
        type="button"
        size="sm"
        variant={status.state === "ready" ? "default" : "outline"}
        className={cn(
          "h-8 shrink-0 px-2.5 text-xs font-semibold",
          status.state === "ready" && "bg-matchon-primary text-white",
        )}
        onClick={() => void onClick()}
        disabled={busy}
        data-testid="desktop-update-button"
        title={tooltip}
        aria-label={labelFor(status)}
      >
        {labelFor(status)}
      </Button>

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
