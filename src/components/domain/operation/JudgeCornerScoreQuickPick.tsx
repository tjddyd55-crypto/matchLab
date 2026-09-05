"use client";

import { cn } from "@/lib/utils";
import {
  organizerOperationDetailFieldLabelClass,
} from "@/lib/ui/organizer-operation-ui";
import {
  getCornerLabelClassName,
  getCornerCardClassName,
} from "@/lib/ui/corner-ui-tokens";

const SCORE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export function JudgeCornerScoreQuickPick({
  corner,
  value,
  disabled,
  onChange,
}: {
  corner: "RED" | "BLUE";
  value: number | null;
  disabled?: boolean;
  onChange: (next: number | null) => void;
}) {
  const cornerLabel = corner === "RED" ? "홍코너" : "청코너";

  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-center justify-between gap-1">
        <span
          className={cn(
            organizerOperationDetailFieldLabelClass,
            getCornerLabelClassName(cornerLabel),
            "text-xs leading-tight sm:text-sm",
          )}
        >
          <span className="font-semibold">{cornerLabel}</span>
          <span className="mx-1 opacity-60">·</span>
          <span className="font-bold">{corner}</span>
        </span>
        {value != null ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(null)}
            className="text-muted-foreground hover:text-foreground shrink-0 text-[10px] underline-offset-2 hover:underline"
          >
            지우기
          </button>
        ) : null}
      </div>
      <div
        className={cn(
          "grid grid-cols-5 gap-0.5 rounded-md border p-1 sm:grid-cols-10 sm:gap-1 sm:p-1.5",
          getCornerCardClassName(cornerLabel),
        )}
      >
        {SCORE_OPTIONS.map((score) => {
          const selected = value === score;
          return (
            <button
              key={score}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              data-testid={`judge-score-${corner.toLowerCase()}-${score}`}
              onClick={() => onChange(selected ? null : score)}
              className={cn(
                "h-7 min-w-0 rounded border text-[11px] font-semibold tabular-nums transition-colors sm:h-8 sm:text-xs",
                selected
                  ? "border-primary bg-primary text-primary-foreground ring-1 ring-primary/40"
                  : "border-input bg-background hover:bg-muted/60",
              )}
            >
              {score}
            </button>
          );
        })}
      </div>
    </div>
  );
}
