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
 * 저장되지 않은 입력 위험 여부.
 * - data-dirty="true" 명시 시만 form dirty로 판단
 * - 읽기 전용 modal은 경고하지 않음
 * - 현재 포커스가 편집 가능한 필드일 때만 추가 경고
 */
function hasUnsavedRisk(): boolean {
  if (typeof document === "undefined") return false;
  if (document.querySelector('[data-dirty="true"]')) return true;

  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) return false;
  if (active.isContentEditable) return true;
  if (active instanceof HTMLTextAreaElement) {
    return !active.readOnly && !active.disabled;
  }
  if (active instanceof HTMLInputElement) {
    if (active.type === "hidden" || active.readOnly || active.disabled) {
      return false;
    }
    return ["text", "search", "email", "tel", "url", "password", "number"].includes(
      active.type,
    );
  }
  return false;
}

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
  const [nativeConfirmOpen, setNativeConfirmOpen] = useState(false);
  const [webConfirmOpen, setWebConfirmOpen] = useState(false);
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

  async function runNativeInstall() {
    setNativeConfirmOpen(false);
    await window.matchonDesktop?.installDesktopUpdate?.();
  }

  async function runWebApply() {
    setWebConfirmOpen(false);
    const ok = await window.matchonDesktop?.applyWebUpdate?.();
    if (ok === false) {
      setFlash("업데이트를 적용하지 못했습니다. 다시 시도해 주세요.");
    }
  }

  async function onClick() {
    if (display.action === "none") return;

    if (display.action === "install_native") {
      setNativeConfirmOpen(true);
      return;
    }

    if (display.action === "apply_web") {
      if (hasUnsavedRisk()) {
        setWebConfirmOpen(true);
        return;
      }
      await runWebApply();
      return;
    }

    if (display.action === "flash_latest") {
      setFlash("최신 버전입니다.");
      return;
    }

    if (display.action === "check") {
      const next = await runCheck();
      if (!next) return;
      const nextDisplay = getDesktopUpdateDisplayState(next);
      if (nextDisplay.label === "최신 버전입니다") {
        setFlash("최신 버전입니다.");
      }
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

      <Dialog open={nativeConfirmOpen} onOpenChange={setNativeConfirmOpen}>
        <DialogContent className="sm:max-w-sm" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>프로그램 업데이트</DialogTitle>
            <DialogDescription>
              프로그램 업데이트를 적용하면 MATCHON Manager가 한 번 재시작됩니다.
              저장되지 않은 작업이 있으면 먼저 저장해 주세요.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setNativeConfirmOpen(false)}
            >
              취소
            </Button>
            <Button type="button" onClick={() => void runNativeInstall()}>
              재시작하여 업데이트
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={webConfirmOpen} onOpenChange={setWebConfirmOpen}>
        <DialogContent className="sm:max-w-sm" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>화면 업데이트</DialogTitle>
            <DialogDescription>
              화면을 새로고침하면 저장하지 않은 내용이 사라질 수 있습니다.
              업데이트를 적용할까요?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setWebConfirmOpen(false)}
            >
              취소
            </Button>
            <Button type="button" onClick={() => void runWebApply()}>
              새로고침하여 적용
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
