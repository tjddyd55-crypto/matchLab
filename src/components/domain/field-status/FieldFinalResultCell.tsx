"use client";

import { computeFieldFinalResult } from "@/lib/field-final-result";
import type { FieldStatusRowDTO } from "@/lib/services/field-status.service";
import { cn } from "@/lib/utils";

export function FieldFinalResultCell({ row }: { row: FieldStatusRowDTO }) {
  const result = computeFieldFinalResult(row);
  const isUnset = result.label === "미입력";

  return (
    <div className="min-w-[9rem] space-y-1">
      <p
        className={cn(
          "text-xs font-medium leading-snug",
          isUnset && "text-muted-foreground",
        )}
      >
        {result.label}
      </p>
      {result.handicapLabel ? (
        <p className="text-[11px] leading-snug text-amber-800 dark:text-amber-200">
          {result.handicapLabel}
        </p>
      ) : null}
    </div>
  );
}
