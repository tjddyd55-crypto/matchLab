import type { ReactNode } from "react";
import { BracketFighterInlineIdentity } from "@/components/domain/brackets/BracketFighterInlineIdentity";
import { cn } from "@/lib/utils";

export type BracketFighterCompactBadgeVariant =
  | "default"
  | "warning"
  | "destructive";

export function BracketFighterCompactBadge({
  label,
  variant = "default",
  title,
}: {
  label: string;
  variant?: BracketFighterCompactBadgeVariant;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none",
        variant === "default" && "bg-primary/10 text-primary",
        variant === "warning" &&
          "bg-amber-500/15 text-amber-800 dark:text-amber-200",
        variant === "destructive" && "bg-destructive/10 text-destructive",
      )}
    >
      {label}
    </span>
  );
}

/** 대진표 후보·경기 편집 슬롯 공용 — 체육관 · 선수명 한 줄 compact */
export function BracketFighterCompactCard({
  fighterName,
  gymName,
  statusBadges,
  metaLine,
  weightRecordStats,
  empty = false,
  emptyLabel = "선수 미정",
  centerIdentity = false,
  className,
  children,
}: {
  fighterName?: string;
  gymName?: string;
  statusBadges?: ReactNode;
  metaLine?: string;
  /** 체중 · 전적 — 후보/빠른 배정 카드 보조정보 (metaLine보다 크게 표시) */
  weightRecordStats?: {
    weightText?: string;
    recordText?: string;
  };
  empty?: boolean;
  emptyLabel?: string;
  /** 선수명 영역 가로·세로 중앙 정렬 (대진표 보기 row) */
  centerIdentity?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  if (empty) {
    return (
      <div
        className={cn(
          "min-w-0 space-y-1",
          centerIdentity && "flex flex-col items-center text-center",
          className,
        )}
      >
        <BracketFighterInlineIdentity fallbackText={emptyLabel} />
        {children}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "min-w-0 space-y-0.5",
        centerIdentity && "text-center",
        className,
      )}
    >
      <div
        className={cn(
          "flex min-w-0 items-center gap-1.5",
          centerIdentity ? "justify-center" : "",
        )}
      >
        <BracketFighterInlineIdentity
          fighterName={fighterName}
          gymName={gymName}
          className={cn("min-w-0", !centerIdentity && "flex-1")}
        />
        {statusBadges ? (
          <div
            className={cn(
              "flex shrink-0 flex-wrap gap-1",
              centerIdentity ? "justify-center" : "justify-end",
            )}
          >
            {statusBadges}
          </div>
        ) : null}
      </div>
      {metaLine ? (
        <p
          className={cn(
            "text-muted-foreground truncate text-[10px] leading-none whitespace-nowrap",
            centerIdentity && "text-center",
          )}
          title={metaLine}
        >
          {metaLine}
        </p>
      ) : null}
      {weightRecordStats?.weightText || weightRecordStats?.recordText ? (
        <p
          className={cn(
            "flex min-w-0 items-baseline gap-1 text-sm font-medium leading-snug text-slate-600 dark:text-slate-300",
            centerIdentity && "justify-center",
          )}
          title={[weightRecordStats.weightText, weightRecordStats.recordText]
            .filter(Boolean)
            .join(" · ")}
        >
          {weightRecordStats.weightText ? (
            <span className="shrink-0 tabular-nums">
              {weightRecordStats.weightText}
            </span>
          ) : null}
          {weightRecordStats.weightText && weightRecordStats.recordText ? (
            <span className="shrink-0 text-slate-400 dark:text-slate-500">
              ·
            </span>
          ) : null}
          {weightRecordStats.recordText ? (
            <span className="min-w-0 truncate tabular-nums">
              {weightRecordStats.recordText}
            </span>
          ) : null}
        </p>
      ) : null}
      {children}
    </div>
  );
}
