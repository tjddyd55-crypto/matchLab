import type { FieldStatusRowDTO } from "@/lib/services/field-status.service";
import { WeighInStatus } from "@/generated/prisma";
import { CheckInStatus } from "@/lib/enums";
import { getSelectableListCardClass } from "@/lib/ui/selectable-list-card";

export type FieldStatusListTone =
  | "dq_noshow"
  | "weigh_fail"
  | "weigh_pass"
  | "checked_in"
  | "pending";

/** 목록 카드 톤 — 우선순위 1개만 적용 */
export function getFieldStatusListTone(
  row: Pick<FieldStatusRowDTO, "checkInStatus" | "weighInStatus">,
): FieldStatusListTone {
  if (
    row.checkInStatus === CheckInStatus.disqualified ||
    row.checkInStatus === CheckInStatus.no_show ||
    row.checkInStatus === CheckInStatus.withdrawn
  ) {
    return "dq_noshow";
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
  if (row.checkInStatus === CheckInStatus.checked_in) {
    return "checked_in";
  }
  return "pending";
}

export function getFieldStatusListToneClassName(tone: FieldStatusListTone): string {
  switch (tone) {
    case "dq_noshow":
      return "border-rose-300 bg-[#FFF1F2] hover:bg-[#FFE4E6]";
    case "weigh_fail":
      return "border-orange-300 bg-[#FFF7ED] hover:bg-[#FFEDD5]";
    case "weigh_pass":
      return "border-emerald-300 bg-[#ECFDF5] hover:bg-[#D1FAE5]";
    case "checked_in":
      return "border-sky-300 bg-[#EFF6FF] hover:bg-[#DBEAFE]";
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
    toneClassName: getFieldStatusListToneClassName(tone),
  });
}

export function getFieldCheckInStepHint(
  status: FieldStatusRowDTO["checkInStatus"],
): string {
  switch (status) {
    case CheckInStatus.checked_in:
      return "완료";
    case CheckInStatus.no_show:
      return "미출석";
    case CheckInStatus.withdrawn:
      return "철회";
    case CheckInStatus.disqualified:
      return "실격";
    default:
      return "미확인";
  }
}

export function getFieldWeighInStepHint(
  status: FieldStatusRowDTO["weighInStatus"],
): string {
  switch (status) {
    case WeighInStatus.pass:
      return "통과";
    case WeighInStatus.manual_pass:
      return "수동 승인";
    case WeighInStatus.fail:
    case WeighInStatus.manual_fail:
      return "실패";
    default:
      return "미실시";
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
