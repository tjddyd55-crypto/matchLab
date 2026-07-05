"use client";

import { Badge } from "@/components/ui/badge";
import { computeFieldFinalResult } from "@/lib/field-final-result";
import { getFieldFinalResultBadgeVariant } from "@/lib/ui/field-status-ui";
import { statusBadgeSizeClasses } from "@/lib/ui/status-badge-ui";
import type { FieldStatusRowDTO } from "@/lib/services/field-status.service";
import {
  CheckInStatus,
  WeighInFailureResolution,
  WeighInStatus,
} from "@/generated/prisma";

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
      className={`${statusBadgeSizeClasses[size]} whitespace-nowrap`}
    >
      {result.label}
    </Badge>
  );
}

function isWeighInFailed(status: WeighInStatus): boolean {
  return status === WeighInStatus.fail || status === WeighInStatus.manual_fail;
}

function WeighInFailurePills({
  resolution,
  size = "sm",
}: {
  resolution: WeighInFailureResolution;
  size?: keyof typeof statusBadgeSizeClasses;
}) {
  const sizeClass = statusBadgeSizeClasses[size];
  return (
    <div className="flex min-w-0 flex-nowrap items-center justify-center gap-1">
      <Badge variant="weighFailed" className={`${sizeClass} whitespace-nowrap`}>
        계체실패
      </Badge>
      {resolution === WeighInFailureResolution.proceed_with_handicap ? (
        <>
          <Badge
            variant="resultFailedContinue"
            className={`${sizeClass} whitespace-nowrap`}
          >
            경기진행
          </Badge>
          <Badge
            variant="resultFailedHandicap"
            className={`${sizeClass} whitespace-nowrap`}
          >
            핸디캡
          </Badge>
        </>
      ) : null}
      {resolution === WeighInFailureResolution.cancel_match ? (
        <Badge
          variant="resultFailedCancelled"
          className={`${sizeClass} whitespace-nowrap`}
        >
          경기취소
        </Badge>
      ) : null}
    </div>
  );
}

export function FieldFinalResultCell({ row }: { row: FieldStatusRowDTO }) {
  if (
    row.checkInStatus !== CheckInStatus.disqualified &&
    isWeighInFailed(row.weighInStatus)
  ) {
    return (
      <div className="flex w-full min-w-0 justify-center">
        <WeighInFailurePills resolution={row.weighInFailureResolution} />
      </div>
    );
  }

  const result = computeFieldFinalResult(row);

  return (
    <div className="flex w-full min-w-0 flex-col items-center justify-center gap-0.5">
      <FieldFinalResultBadge row={row} />
      {result.reasonLabel ? (
        <p
          className="text-muted-foreground max-w-full truncate text-[10px] leading-none whitespace-nowrap"
          title={result.reasonLabel}
        >
          {result.reasonLabel}
        </p>
      ) : null}
    </div>
  );
}
