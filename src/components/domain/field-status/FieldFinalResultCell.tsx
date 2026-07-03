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
      className={statusBadgeSizeClasses[size]}
    >
      {result.label}
    </Badge>
  );
}

function isWeighInFailed(status: WeighInStatus): boolean {
  return status === WeighInStatus.fail || status === WeighInStatus.manual_fail;
}

/**
 * 계체실패 흐름 배지 묶음.
 * - 미결정: [계체실패]
 * - 경기진행 허용: [계체실패] [경기진행] [핸디캡]
 * - 경기취소: [계체실패] [경기취소]
 * 핸디캡 메모(텍스트)는 표시하지 않는다.
 */
function WeighInFailurePills({
  resolution,
  size = "sm",
}: {
  resolution: WeighInFailureResolution;
  size?: keyof typeof statusBadgeSizeClasses;
}) {
  const sizeClass = statusBadgeSizeClasses[size];
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1">
      <Badge variant="weighFailed" className={sizeClass}>
        계체실패
      </Badge>
      {resolution === WeighInFailureResolution.proceed_with_handicap ? (
        <>
          <Badge variant="resultFailedContinue" className={sizeClass}>
            경기진행
          </Badge>
          <Badge variant="resultFailedHandicap" className={sizeClass}>
            핸디캡
          </Badge>
        </>
      ) : null}
      {resolution === WeighInFailureResolution.cancel_match ? (
        <Badge variant="resultFailedCancelled" className={sizeClass}>
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
      <div className="min-w-0">
        <WeighInFailurePills resolution={row.weighInFailureResolution} />
      </div>
    );
  }

  const result = computeFieldFinalResult(row);

  return (
    <div className="min-w-0 space-y-1">
      <FieldFinalResultBadge row={row} />
      {result.reasonLabel ? (
        <p className="text-muted-foreground text-[11px] leading-snug">
          {result.reasonLabel}
        </p>
      ) : null}
    </div>
  );
}
