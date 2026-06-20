import {
  CheckInStatus,
  WeighInFailureResolution,
  WeighInStatus,
} from "@/generated/prisma";
import type { FieldStatusRowDTO } from "@/lib/services/field-status.service";

export type FieldFinalResultDisplay = {
  label: string;
  handicapLabel?: string;
};

function isWeighInPassed(status: WeighInStatus): boolean {
  return status === WeighInStatus.pass || status === WeighInStatus.manual_pass;
}

function isWeighInFailed(status: WeighInStatus): boolean {
  return status === WeighInStatus.fail || status === WeighInStatus.manual_fail;
}

function hasWeighInInput(row: FieldStatusRowDTO): boolean {
  return (
    row.weighInWeightKg != null ||
    row.weighInStatus !== WeighInStatus.pending ||
    row.weighInFailureResolution !== WeighInFailureResolution.pending ||
    Boolean(row.handicapNote?.trim())
  );
}

/** 현장/계체 목록용 read-only 최종결과 */
export function computeFieldFinalResult(
  row: FieldStatusRowDTO,
): FieldFinalResultDisplay {
  if (row.checkInStatus === "disqualified") {
    const reason = row.disqualificationReason?.trim();
    if (reason === "신청철회") {
      return { label: "실격 · 신청철회" };
    }
    if (reason === "미출석") {
      return { label: "실격 · 미출석" };
    }
    if (reason) {
      return { label: "실격 · 기타 사유" };
    }
    return { label: "실격" };
  }

  if (isWeighInPassed(row.weighInStatus)) {
    return { label: "계체통과" };
  }

  if (isWeighInFailed(row.weighInStatus)) {
    if (
      row.weighInFailureResolution ===
      WeighInFailureResolution.proceed_with_handicap
    ) {
      const note = row.handicapNote?.trim();
      return {
        label: note
          ? "계체실패 · 경기진행 · 핸디캡 적용"
          : "계체실패 · 경기진행",
        handicapLabel: note ? `핸디캡: ${note}` : undefined,
      };
    }
    if (
      row.weighInFailureResolution === WeighInFailureResolution.cancel_match
    ) {
      return { label: "계체실패 · 경기취소" };
    }
    return { label: "계체실패" };
  }

  if (!hasWeighInInput(row)) {
    return { label: "미입력" };
  }

  return { label: "미입력" };
}

/** 계체·현장 입력이 하나라도 있으면 초기화 가능 (완전 미입력만 비활성) */
export function canResetFieldStatusInput(row: FieldStatusRowDTO): boolean {
  if (row.checkInStatus !== CheckInStatus.pending) {
    return true;
  }
  if (row.weighInWeightKg != null) {
    return true;
  }
  if (row.weighInStatus !== WeighInStatus.pending) {
    return true;
  }
  if (row.weighInFailureResolution !== WeighInFailureResolution.pending) {
    return true;
  }
  if (row.handicapNote?.trim()) {
    return true;
  }
  if (row.disqualificationReason?.trim()) {
    return true;
  }
  if (row.fieldMemo?.trim()) {
    return true;
  }
  return computeFieldFinalResult(row).label !== "미입력";
}
