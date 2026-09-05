"use client";

import { cn } from "@/lib/utils";
import {
  organizerOperationDetailFieldLabelClass,
  organizerOperationDetailLabelControlClass,
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
    <div className={organizerOperationDetailLabelControlClass}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span
          className={cn(
            organizerOperationDetailFieldLabelClass,
            getCornerLabelClassName(cornerLabel),
          )}
        >
          {corner}
        </span>
        {value != null ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(null)}
            className="text-muted-foreground hover:text-foreground text-[11px] underline-offset-2 hover:underline"
          >
            지우기
          </button>
        ) : null}
      </div>
      <div
        className={cn(
          "grid grid-cols-5 gap-1 rounded-md border p-1.5",
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
                "h-8 rounded-md border text-xs font-semibold tabular-nums transition-colors",
                selected
                  ? "border-primary bg-primary text-primary-foreground"
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
