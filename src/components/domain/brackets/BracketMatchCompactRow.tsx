import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** 경기 row 공통 grid — 경기번호 | 홍 | 중앙 | 청 */
export const bracketMatchRowGridClass =
  "grid grid-cols-1 gap-2 md:grid-cols-[3.25rem_minmax(0,1fr)_5.75rem_minmax(0,1fr)] md:items-stretch md:gap-x-2";

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
        "text-muted-foreground mb-1 hidden px-2 text-[10px] font-medium uppercase tracking-wide md:grid",
        className,
      )}
    >
      <span className="text-center">경기</span>
      <span>홍코너</span>
      <span className="text-center">{centerLabel ?? ""}</span>
      <span className="text-right md:text-left">청코너</span>
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

      <div className={cn(bracketMatchRowGridClass, "px-2 py-2")}>
        <div className="flex min-h-[2.5rem] flex-col items-start justify-center gap-1 md:items-center md:text-center">
          <span className="text-xs font-bold tabular-nums leading-none">
            {matchOrderLabel}
          </span>
          {statusArea}
        </div>

        <div className="min-w-0">{redSlot}</div>

        <div className="border-border/60 flex min-h-[2.5rem] items-center justify-center border-y py-1 md:border-y-0 md:py-0">
          {center}
        </div>

        <div className="min-w-0">{blueSlot}</div>
      </div>

      {controls ? (
        <div className="border-t bg-muted/10 px-2 py-1.5">{controls}</div>
      ) : null}

      {footer}
    </article>
  );
}
