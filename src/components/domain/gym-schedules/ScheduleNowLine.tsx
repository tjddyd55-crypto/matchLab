"use client";

import { useEffect, useState } from "react";
import {
  nowHmLabel,
  nowLineTopPx,
} from "@/lib/gym-schedule/board-geometry";
import { SCHEDULE_BOARD_LAYER } from "@/lib/gym-schedule/board-layout";
import { toSeoulDateKey } from "@/lib/gym-schedule/seoul-schedule";
import { cn } from "@/lib/utils";

/**
 * 주/일 보드 현재 시간선.
 * - day: 해당 컬럼(또는 일간 보드) 너비
 * - week: 시간축 오른쪽~일요일까지 주간 전체 너비 (오늘이 주에 포함될 때만)
 *
 * Hydration: SSR과 client 첫 렌더는 동일하게 null.
 * mount 이후에만 `Date`를 읽어 표시한다 (서버/브라우저 시각 차로 #418 방지).
 */
export function ScheduleNowLine({
  dateKey,
  weekDateKeys,
  variant = "day",
  className,
}: {
  /** 일간: 선택일이 오늘일 때만 표시 */
  dateKey?: string;
  /** 주간: 오늘이 배열에 포함될 때만 전체 너비 표시 */
  weekDateKeys?: string[];
  variant?: "day" | "week";
  className?: string;
}) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  if (now == null) return null;

  const todayKey = toSeoulDateKey(now);
  const visible =
    variant === "week"
      ? Boolean(weekDateKeys?.includes(todayKey))
      : dateKey === todayKey;

  if (!visible) return null;
  const top = nowLineTopPx(now);
  if (top == null) return null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 flex items-center",
        SCHEDULE_BOARD_LAYER.nowLine,
        className,
      )}
      style={{ top }}
      data-testid="schedule-now-line"
      data-now-variant={variant}
      aria-hidden
    >
      <span className="absolute -left-1 size-2.5 -translate-x-1/2 rounded-full bg-matchon-primary shadow-sm" />
      <span className="absolute -left-1 -translate-x-full -translate-y-1/2 whitespace-nowrap rounded bg-matchon-primary px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white shadow-sm md:text-[11px]">
        {nowHmLabel(now)}
      </span>
      <div className="h-0.5 w-full bg-matchon-primary/90 shadow-[0_0_0_1px_rgba(37,99,235,0.15)]" />
    </div>
  );
}
