/**
 * 체육관 회원 Excel export field registry — 회원 목록 UI label/순서 SSOT.
 */
import { formatUtcDateOnly } from "@/lib/date-only";
import { formatWon } from "@/lib/format-won";
import { formatPhoneNumber } from "@/lib/phone";
import type { GymMemberListItemVM } from "@/lib/services/gym-member.service";
import type { ExcelExportField } from "@/lib/excel-export/types";
import {
  defaultExcelExportFieldKeys,
  resolveExcelExportFields,
} from "@/lib/excel-export/field-registry";

export type GymMemberExcelExportRow = GymMemberListItemVM;

export type GymMemberExcelExportFieldKey =
  | "rowNumber"
  | "name"
  | "phone"
  | "groups"
  | "status"
  | "planName"
  | "startedAt"
  | "endsAt"
  | "periodRemaining"
  | "attendanceCount"
  | "paymentAmount";

export type GymMemberExcelExportField = ExcelExportField<
  GymMemberExcelExportFieldKey,
  GymMemberExcelExportRow
>;

function formatGroups(names: string[]): string {
  return names.length > 0 ? names.join(", ") : "—";
}

/** MemberTable 업무 컬럼 순서 (# · 관리 제외 기본, #는 선택 옵션) */
export const GYM_MEMBER_EXCEL_EXPORT_FIELDS: readonly GymMemberExcelExportField[] =
  [
    {
      key: "rowNumber",
      label: "#",
      defaultSelected: false,
      extract: (_row, sequence) => String(sequence),
    },
    {
      key: "name",
      label: "회원명",
      defaultSelected: true,
      extract: (row) => row.name,
    },
    {
      key: "phone",
      label: "연락처",
      defaultSelected: true,
      textFormat: true,
      extract: (row) => formatPhoneNumber(row.phone),
    },
    {
      key: "groups",
      label: "그룹",
      defaultSelected: true,
      extract: (row) => formatGroups(row.groupNames),
    },
    {
      key: "status",
      label: "상태",
      defaultSelected: true,
      extract: (row) => row.membershipStatusLabel,
    },
    {
      key: "planName",
      label: "회원권",
      defaultSelected: true,
      extract: (row) => row.planName ?? "회원권 없음",
    },
    {
      key: "startedAt",
      label: "이용시작일",
      defaultSelected: true,
      extract: (row) =>
        row.startedAt ? formatUtcDateOnly(row.startedAt) : "—",
    },
    {
      key: "endsAt",
      label: "이용종료일",
      defaultSelected: true,
      extract: (row) => (row.endsAt ? formatUtcDateOnly(row.endsAt) : "—"),
    },
    {
      key: "periodRemaining",
      label: "이용기간/잔여",
      defaultSelected: true,
      extract: (row) => row.periodRemainingLabel ?? "—",
    },
    {
      key: "attendanceCount",
      label: "출석횟수",
      defaultSelected: true,
      extract: (row) =>
        row.attendanceCount == null ? "—" : `${row.attendanceCount}회`,
    },
    {
      key: "paymentAmount",
      label: "결제금액",
      defaultSelected: true,
      extract: (row) =>
        row.paymentAmount == null ? "—" : formatWon(row.paymentAmount),
    },
  ] as const;

export function resolveGymMemberExcelExportFields(
  selectedKeys: readonly string[],
): GymMemberExcelExportField[] {
  return resolveExcelExportFields(GYM_MEMBER_EXCEL_EXPORT_FIELDS, selectedKeys);
}

export function defaultGymMemberExcelExportFieldKeys(): GymMemberExcelExportFieldKey[] {
  return defaultExcelExportFieldKeys(GYM_MEMBER_EXCEL_EXPORT_FIELDS);
}
