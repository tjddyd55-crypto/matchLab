import type { FieldStatusRowDTO } from "@/lib/services/field-status.service";
import { WeighInStatus } from "@/generated/prisma";
import { CheckInStatus } from "@/lib/enums";
import { getWeighInStatusLabel } from "@/lib/field-eligibility";
import { getSelectableListCardClass } from "@/lib/ui/selectable-list-card";

export type FieldStatusListTone =
  | "dq_noshow"
  | "weigh_fail"
  | "weigh_pass"
  | "handicap"
  | "pending";

/** 목록 카드 톤 — 우선순위 1개만 적용 */
export function getFieldStatusListTone(
  row: Pick<
    FieldStatusRowDTO,
    "checkInStatus" | "weighInStatus" | "weighInFailureResolution"
  >,
): FieldStatusListTone {
  if (
    row.checkInStatus === CheckInStatus.disqualified ||
    row.checkInStatus === CheckInStatus.no_show ||
    row.checkInStatus === CheckInStatus.withdrawn
  ) {
    return "dq_noshow";
  }
  if (row.weighInFailureResolution === "cancel_match") {
    return "dq_noshow";
  }
  if (row.weighInFailureResolution === "proceed_with_handicap") {
    return "handicap";
  }
  if (
    row.weighInStatus === WeighInStatus.fail ||
    row.weighInStatus === WeighInStatus.manual_fail
  ) {
    return "weigh_fail";
  }
  if (
    row.weighInStatus === WeighInStatus.pass ||
    row.weighInStatus === WeighInStatus.manual_pass
  ) {
    return "weigh_pass";
  }
  return "pending";
}

export function getFieldStatusListToneClassName(tone: FieldStatusListTone): string {
  switch (tone) {
    case "dq_noshow":
      return "border-rose-300 bg-[#FFF1F2] hover:bg-[#FFE4E6]";
    case "weigh_fail":
      return "border-orange-300 bg-[#FFF7ED] hover:bg-[#FFEDD5]";
    case "handicap":
      return "border-amber-300 bg-[#FFFBEB] hover:bg-[#FEF3C7]";
    case "weigh_pass":
      return "border-emerald-300 bg-[#ECFDF5] hover:bg-[#D1FAE5]";
    default:
      return "border-[#E2E8F0] bg-white hover:border-matchon-primary/40 hover:bg-matchon-primary-light/20";
  }
}

export function getFieldStatusListCardClass({
  selected,
  tone,
}: {
  selected: boolean;
  tone: FieldStatusListTone;
}): string {
  return getSelectableListCardClass({
    selected,
    selectedStyle: "soft",
    toneClassName: getFieldStatusListToneClassName(tone),
  });
}

/** 목록용 계체 badge 라벨 */
export function getFieldWeighInBadgeLabel(
  status: FieldStatusRowDTO["weighInStatus"],
): string {
  return getWeighInStatusLabel(status);
}

/**
 * 목록용 2번째 badge — 진행/실격/핸디캡.
 * 현장 확인 badge는 사용하지 않는다.
 */
export function getFieldProgressBadgeLabel(
  row: Pick<
    FieldStatusRowDTO,
    | "checkInStatus"
    | "weighInStatus"
    | "weighInFailureResolution"
    | "isEligibleForBracket"
    | "eligibilityLabel"
  >,
): string | null {
  if (row.checkInStatus === CheckInStatus.no_show) return "미출석";
  if (row.checkInStatus === CheckInStatus.disqualified) return "실격";
  if (row.checkInStatus === CheckInStatus.withdrawn) return "철회";
  if (row.weighInFailureResolution === "proceed_with_handicap") {
    return "핸디캡 경기";
  }
  if (row.weighInFailureResolution === "cancel_match") {
    return "경기취소";
  }
  if (row.isEligibleForBracket) return "출전 확정";
  return null;
}

export function getFieldWeighInStepHint(
  status: FieldStatusRowDTO["weighInStatus"],
): string {
  switch (status) {
    case WeighInStatus.pass:
    case WeighInStatus.manual_pass:
      return "통과";
    case WeighInStatus.fail:
    case WeighInStatus.manual_fail:
      return "실패";
    default:
      return "대기";
  }
}

export function getFieldProgressStepHint(
  row: Pick<
    FieldStatusRowDTO,
    | "checkInStatus"
    | "weighInStatus"
    | "weighInFailureResolution"
    | "isEligibleForBracket"
  >,
): string {
  if (
    row.checkInStatus === CheckInStatus.no_show ||
    row.checkInStatus === CheckInStatus.disqualified ||
    row.checkInStatus === CheckInStatus.withdrawn
  ) {
    return "진행 불가";
  }
  if (row.weighInFailureResolution === "cancel_match") {
    return "경기 취소";
  }
  if (row.weighInFailureResolution === "proceed_with_handicap") {
    return "핸디캡 진행";
  }
  if (row.isEligibleForBracket) {
    return "진행 가능";
  }
  if (
    row.weighInStatus === WeighInStatus.fail ||
    row.weighInStatus === WeighInStatus.manual_fail
  ) {
    return "결정 필요";
  }
  return "대기";
}

export function shouldShowFieldReasonSection(
  row: Pick<
    FieldStatusRowDTO,
    "checkInStatus" | "weighInStatus" | "weighInFailureResolution"
  >,
): boolean {
  if (
    row.checkInStatus === CheckInStatus.no_show ||
    row.checkInStatus === CheckInStatus.disqualified ||
    row.checkInStatus === CheckInStatus.withdrawn
  ) {
    return true;
  }
  if (
    row.weighInStatus === WeighInStatus.fail ||
    row.weighInStatus === WeighInStatus.manual_fail
  ) {
    return true;
  }
  if (row.weighInFailureResolution === "cancel_match") {
    return true;
  }
  return false;
}
