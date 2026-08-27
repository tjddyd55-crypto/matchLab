import type { ReactNode } from "react";
import {
  bracketMatchControlsGridClass,
  bracketMatchFightersGridClass,
  matchGridCellCenterClass,
} from "@/lib/ui/match-grid-layout";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export { bracketMatchRowGridClass } from "@/lib/ui/match-grid-layout";

export function BracketMatchColumnHeader({
  className,
  centerLabel,
  statusLabel = "상태",
}: {
  className?: string;
  centerLabel?: string;
  statusLabel?: string;
}) {
  return (
    <div
      className={cn(
        "text-muted-foreground mb-1 hidden px-3 text-[10px] font-medium uppercase tracking-wide md:grid md:grid-cols-[minmax(220px,1fr)_minmax(140px,170px)_minmax(220px,1fr)] md:gap-x-2 desktop:grid-cols-[minmax(0,1fr)_minmax(140px,170px)_minmax(0,1fr)]",
        className,
      )}
    >
      <span className="text-center">홍코너</span>
      <span className="text-center">{centerLabel ?? "VS"}</span>
      <span className="text-center">청코너</span>
      <span className="sr-only">{statusLabel}</span>
    </div>
  );
}

export function BracketMatchCompactRow({
  matchOrderLabel,
  leadingExtra,
  divisionHint,
  statusArea,
  redSlot,
  center,
  blueSlot,
  controls,
  footer,
  className,
}: {
  matchOrderLabel: string;
  /** 경기번호 옆 — 체중 입력 등 */
  leadingExtra?: ReactNode;
  divisionHint?: string | null;
  statusArea?: ReactNode;
  redSlot: ReactNode;
  center: ReactNode;
  blueSlot: ReactNode;
  controls?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("gap-0 overflow-hidden py-0", className)}>
      <div className="flex items-center justify-between gap-2 border-b border-matchon-border bg-matchon-primary-light/20 px-3 py-1.5">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <span className="shrink-0 text-base font-bold leading-none text-[#0F172A] tabular-nums whitespace-nowrap">
            {matchOrderLabel}
          </span>
          {leadingExtra}
          {divisionHint ? (
            <span
              className="text-muted-foreground min-w-0 truncate text-xs leading-tight"
              title={divisionHint}
            >
              {divisionHint}
            </span>
          ) : null}
        </div>
        {statusArea ? (
          <div className="flex shrink-0 items-center justify-end gap-2">
            {statusArea}
          </div>
        ) : null}
      </div>

      <div className={cn(bracketMatchFightersGridClass)}>
        <div className={matchGridCellCenterClass}>{redSlot}</div>
        <div className={cn(matchGridCellCenterClass, "min-w-[140px] desktop:min-w-0")}>
          {center}
        </div>
        <div className={matchGridCellCenterClass}>{blueSlot}</div>
      </div>

      {controls ? (
        <div className="border-t border-matchon-border bg-muted/10 px-3 py-1.5">
          {controls}
        </div>
      ) : null}

      {footer}
    </Card>
  );
}

/** 하단 control row — 좌: 경기장 / 중: 라운드·시간 / 우: 순서 */
export function BracketMatchControlsRow({
  left,
  center,
  right,
  className,
}: {
  left: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(bracketMatchControlsGridClass, className)}>
      <div className="flex min-w-0 flex-wrap items-center justify-start justify-self-start gap-2">
        {left}
      </div>
      {center ? (
        <div className="flex min-w-0 items-center justify-center justify-self-center px-1 text-center [word-break:keep-all] whitespace-normal">
          {center}
        </div>
      ) : null}
      {right ? (
        <div className="flex items-center justify-end justify-self-end gap-1">
          {right}
        </div>
      ) : null}
    </div>
  );
}
