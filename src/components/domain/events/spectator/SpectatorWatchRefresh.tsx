"use client";

import { useCallback, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { SpectatorWatchTabId } from "@/lib/public-event-watch";

const REFRESH_MS = 12_000;

export function SpectatorWatchRefresh({
  tab,
}: {
  tab: SpectatorWatchTabId;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const refresh = useCallback(() => {
    startTransition(() => {
      router.refresh();
    });
  }, [router]);

  useEffect(() => {
    if (tab === "live") return;
    const timer = window.setInterval(refresh, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [refresh, tab]);

  useEffect(() => {
    function onFocus() {
      refresh();
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  return (
    <div className="flex justify-end">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 px-2 text-xs text-muted-foreground"
        disabled={pending}
        onClick={refresh}
      >
        {pending ? "새로고침 중…" : "새로고침"}
      </Button>
    </div>
  );
}
