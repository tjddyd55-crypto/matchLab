import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** 경기 row 공통 grid — 경기번호 | 홍 | 중앙 | 청 */
export const bracketMatchRowGridClass =
  "grid grid-cols-1 gap-1.5 md:grid-cols-[2.75rem_minmax(0,1fr)_5rem_minmax(0,1fr)] md:items-center md:gap-x-2";

export function BracketMatchColumnHeader({
  className,
  centerLabel,
}: {
  className?: string;
  centerLabel?: string;
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
      <span>홍코너</span>
      <span className="text-center">{centerLabel ?? ""}</span>
      <span>청코너</span>
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
        <p className="text-muted-foreground border-b bg-muted/20 px-2 py-0.5 text-[10px] leading-tight">
          {divisionHint}
        </p>
      ) : null}

      <div className={cn(bracketMatchRowGridClass, "px-2 py-1.5")}>
        <div className="flex flex-col items-start justify-center gap-0.5 md:items-center md:text-center">
          <span className="text-xs font-bold tabular-nums leading-none">
            {matchOrderLabel}
          </span>
          {statusArea}
        </div>

        <div className="flex min-h-[2.75rem] min-w-0 items-center">{redSlot}</div>

        <div className="flex min-h-[2.75rem] items-center justify-center self-center">
          {center}
        </div>

        <div className="flex min-h-[2.75rem] min-w-0 items-center">{blueSlot}</div>
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
    <div
      className={cn(
        "grid grid-cols-1 items-center gap-2 md:grid-cols-[minmax(0,1fr)_auto_auto]",
        className,
      )}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2">{left}</div>
      {center ? (
        <div className="flex shrink-0 items-center justify-center">{center}</div>
      ) : null}
      {right ? (
        <div className="flex shrink-0 items-center justify-end gap-1">
          {right}
        </div>
      ) : null}
    </div>
  );
}
