"use client";

import { Badge } from "@/components/ui/badge";
import { computeFieldFinalResult } from "@/lib/field-final-result";
import { getFieldFinalResultBadgeVariant } from "@/lib/ui/field-status-ui";
import { statusBadgeSizeClasses } from "@/lib/ui/status-badge-ui";
import type { FieldStatusRowDTO } from "@/lib/services/field-status.service";

export function FieldFinalResultBadge({
  row,
  size = "sm",
}: {
  row: FieldStatusRowDTO;
  size?: keyof typeof statusBadgeSizeClasses;
}) {
  const result = computeFieldFinalResult(row);

  return (
    <Badge
      variant={getFieldFinalResultBadgeVariant(result.tone)}
      className={statusBadgeSizeClasses[size]}
    >
      {result.label}
    </Badge>
  );
}

export function FieldFinalResultCell({ row }: { row: FieldStatusRowDTO }) {
  const result = computeFieldFinalResult(row);

  return (
    <div className="min-w-0 space-y-1">
      <FieldFinalResultBadge row={row} />
      {result.handicapLabel ? (
        <p className="text-[11px] leading-snug text-amber-800 dark:text-amber-200">
          {result.handicapLabel}
        </p>
      ) : null}
      {result.reasonLabel ? (
        <p className="text-muted-foreground text-[11px] leading-snug">
          {result.reasonLabel}
        </p>
      ) : null}
    </div>
  );
}
