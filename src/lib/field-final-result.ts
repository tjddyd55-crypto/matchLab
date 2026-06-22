import type { FieldStatusRowDTO } from "@/lib/services/field-status.service";
import {
  getFieldFinalResultBaseLabel,
  resolveFieldFinalResultTone,
  type FieldFinalResultTone,
} from "@/lib/ui/field-status-ui";
import {
  CheckInStatus,
  WeighInFailureResolution,
  WeighInStatus,
} from "@/generated/prisma";

export type { FieldFinalResultTone } from "@/lib/ui/field-status-ui";

export type FieldFinalResultDisplay = {
  tone: FieldFinalResultTone;
  label: string;
  handicapLabel?: string;
  reasonLabel?: string;
};

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

function disqualifiedLabel(reason: string | null | undefined): string {
  const trimmed = reason?.trim();
  if (trimmed === "신청철회") return "실격 · 신청철회";
  if (trimmed === "미출석") return "실격 · 미출석";
  if (trimmed) return "실격 · 기타";
  return getFieldFinalResultBaseLabel("disqualified");
}

/** 현장/계체 목록용 read-only 경기결과 */
export function computeFieldFinalResult(
  row: FieldStatusRowDTO,
): FieldFinalResultDisplay {
  const tone = resolveFieldFinalResultTone(row);

  if (row.checkInStatus === CheckInStatus.disqualified) {
    const reason = row.disqualificationReason?.trim();
    return {
      tone: "disqualified",
      label: disqualifiedLabel(reason),
      reasonLabel: reason ? `사유: ${reason}` : undefined,
    };
  }

  if (row.weighInStatus === WeighInStatus.manual_pass) {
    return {
      tone: "confirmed",
      label: "수동승인",
    };
  }

  if (tone === "passed") {
    return { tone, label: getFieldFinalResultBaseLabel("passed") };
  }

  if (isWeighInFailed(row.weighInStatus)) {
    if (tone === "failed_handicap") {
      const note = row.handicapNote?.trim();
      return {
        tone,
        label: getFieldFinalResultBaseLabel("failed_handicap"),
        handicapLabel: note ? `핸디캡: ${note}` : undefined,
      };
    }
    if (tone === "failed_cancelled") {
      return {
        tone,
        label: getFieldFinalResultBaseLabel("failed_cancelled"),
      };
    }
    if (tone === "failed_continue") {
      return {
        tone,
        label: getFieldFinalResultBaseLabel("failed_continue"),
      };
    }
    return { tone: "failed_continue", label: "계체실패" };
  }

  if (!hasWeighInInput(row)) {
    return { tone: "pending", label: getFieldFinalResultBaseLabel("pending") };
  }

  return { tone: "pending", label: getFieldFinalResultBaseLabel("pending") };
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
  return computeFieldFinalResult(row).tone !== "pending";
}
