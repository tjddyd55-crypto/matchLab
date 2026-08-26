"use client";

import { matchWeightInputClass } from "@/lib/ui/match-grid-layout";
import { cn } from "@/lib/utils";

export function MatchWeightKgInput({
  value,
  onChange,
  disabled = false,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "flex shrink-0 items-center gap-1",
        className,
      )}
    >
      <input
        type="text"
        inputMode="decimal"
        className={matchWeightInputClass}
        value={value}
        disabled={disabled}
        placeholder="—"
        aria-label="경기 체중"
        title="경기 체중(kg)"
        onChange={(e) => onChange(e.target.value)}
      />
      <span className="text-muted-foreground shrink-0 text-sm font-semibold">
        kg
      </span>
    </label>
  );
}
