/**
 * 협회 회원사 Excel export field registry — 회원사 목록 UI label/순서 SSOT.
 */
import { format } from "date-fns";
import type { ExcelExportField } from "@/lib/excel-export/types";
import {
  defaultExcelExportFieldKeys,
  resolveExcelExportFields,
} from "@/lib/excel-export/field-registry";

export type MemberGymExcelExportRow = {
  id: string;
  gymName: string;
  memberCode: string;
  accountStatusLabel: string;
  fighterTotal: number;
  fighterActive: number;
  statusLabel: string;
  approvedAt: Date | null;
};

export type MemberGymExcelExportFieldKey =
  | "gymName"
  | "memberCode"
  | "accountStatus"
  | "fighterCounts"
  | "status"
  | "approvedAt";

export type MemberGymExcelExportField = ExcelExportField<
  MemberGymExcelExportFieldKey,
  MemberGymExcelExportRow
>;

/** 회원사 목록 테이블 업무 컬럼 순서 */
export const MEMBER_GYM_EXCEL_EXPORT_FIELDS: readonly MemberGymExcelExportField[] =
  [
    {
      key: "gymName",
      label: "회원사명",
      defaultSelected: true,
      extract: (row) => row.gymName,
    },
    {
      key: "memberCode",
      label: "회원사 코드",
      defaultSelected: true,
      extract: (row) => row.memberCode,
    },
    {
      key: "accountStatus",
      label: "계정",
      defaultSelected: true,
      extract: (row) => row.accountStatusLabel,
    },
    {
      key: "fighterCounts",
      label: "선수(전체/활동)",
      defaultSelected: true,
      extract: (row) => `${row.fighterTotal} / ${row.fighterActive}`,
    },
    {
      key: "status",
      label: "상태",
      defaultSelected: true,
      extract: (row) => row.statusLabel,
    },
    {
      key: "approvedAt",
      label: "승인일",
      defaultSelected: true,
      extract: (row) =>
        row.approvedAt ? format(row.approvedAt, "yyyy-MM-dd") : "-",
    },
  ] as const;

export function resolveMemberGymExcelExportFields(
  selectedKeys: readonly string[],
): MemberGymExcelExportField[] {
  return resolveExcelExportFields(MEMBER_GYM_EXCEL_EXPORT_FIELDS, selectedKeys);
}

export function defaultMemberGymExcelExportFieldKeys(): MemberGymExcelExportFieldKey[] {
  return defaultExcelExportFieldKeys(MEMBER_GYM_EXCEL_EXPORT_FIELDS);
}
