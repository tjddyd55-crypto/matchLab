"use client";

import { useEffect, useState } from "react";
import {
  nowHmLabel,
  nowLineTopPx,
} from "@/lib/gym-schedule/board-geometry";
import { toSeoulDateKey } from "@/lib/gym-schedule/seoul-schedule";
import { cn } from "@/lib/utils";

/**
 * 주/일 보드 현재 시간선. 오늘 컬럼에만 표시, 30초마다 위치 갱신.
 */
export function ScheduleNowLine({
  dateKey,
  className,
}: {
  dateKey: string;
  className?: string;
}) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  if (toSeoulDateKey(now) !== dateKey) return null;
  const top = nowLineTopPx(now);
  if (top == null) return null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 z-30 flex items-center",
        className,
      )}
      style={{ top }}
      data-testid="schedule-now-line"
      aria-hidden
    >
      <span className="absolute -left-1 size-2.5 -translate-x-1/2 rounded-full bg-matchon-primary shadow-sm" />
      <span className="absolute -left-12 -translate-y-1/2 rounded bg-matchon-primary px-1 py-0.5 text-[10px] font-semibold tabular-nums text-white">
        {nowHmLabel(now)}
      </span>
      <div className="h-0.5 w-full bg-matchon-primary/90 shadow-[0_0_0_1px_rgba(37,99,235,0.15)]" />
    </div>
  );
}
