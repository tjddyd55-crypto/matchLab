import type { ReactNode } from "react";
import {
  bracketMatchControlsGridClass,
  bracketMatchRowGridClass,
  matchGridCellCenterClass,
  matchGridCellStartClass,
} from "@/lib/ui/match-grid-layout";
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
        bracketMatchRowGridClass,
        "text-muted-foreground mb-0.5 hidden px-2 text-[10px] font-medium uppercase tracking-wide md:grid",
        className,
      )}
    >
      <span className="text-center">경기</span>
      <span className="text-left">홍코너</span>
      <span className="text-center">{centerLabel ?? ""}</span>
      <span className="text-left">청코너</span>
      <span className="text-center">{statusLabel}</span>
    </div>
  );
}

export function BracketMatchCompactRow({
  matchOrderLabel,
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
    <article
      className={cn(
        "ring-foreground/10 overflow-hidden rounded-lg border bg-card shadow-sm",
        className,
      )}
    >
      {divisionHint ? (
        <p
          className="text-muted-foreground truncate border-b bg-muted/20 px-2 py-0.5 text-[10px] leading-tight whitespace-nowrap"
          title={divisionHint}
        >
          {divisionHint}
        </p>
      ) : null}

      <div className={cn(bracketMatchRowGridClass, "px-2 py-1.5")}>
        <div className={matchGridCellCenterClass}>
          <span className="text-xs font-bold tabular-nums leading-none whitespace-nowrap">
            {matchOrderLabel}
          </span>
        </div>

        <div className={matchGridCellStartClass}>{redSlot}</div>

        <div className={matchGridCellCenterClass}>{center}</div>

        <div className={matchGridCellStartClass}>{blueSlot}</div>

        <div className={matchGridCellCenterClass}>{statusArea}</div>
      </div>

      {controls ? (
        <div className="border-t bg-muted/10 px-2 py-1">{controls}</div>
      ) : null}

      {footer}
    </article>
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
      <div className="flex min-w-0 flex-wrap items-center justify-start gap-2">
        {left}
      </div>
      {center ? (
        <div className="flex min-w-0 items-center justify-center whitespace-nowrap">
          {center}
        </div>
      ) : null}
      {right ? (
        <div className="flex items-center justify-end gap-1">{right}</div>
      ) : null}
    </div>
  );
}
