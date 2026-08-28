"use client";

import { useState } from "react";
import { exportMemberGymsExcelAction } from "@/features/member-gyms/actions";
import {
  MEMBER_GYM_EXCEL_EXPORT_FIELDS,
  defaultMemberGymExcelExportFieldKeys,
} from "@/lib/member-gym/member-gym-excel-export-fields";
import {
  ExcelExportTriggerButton,
  SelectableExcelExportDialog,
} from "@/components/shared/excel-export/SelectableExcelExportDialog";

export function MemberGymListExcelExport({
  memberGymIds,
  filteredCount,
  totalCount,
  hasActiveFilters,
  filters,
}: {
  memberGymIds: string[];
  filteredCount: number;
  totalCount: number;
  hasActiveFilters: boolean;
  filters: { q?: string; status?: string };
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <ExcelExportTriggerButton onOpen={() => setOpen(true)} />
      <SelectableExcelExportDialog
        open={open}
        onOpenChange={setOpen}
        title="엑셀 다운로드"
        fields={MEMBER_GYM_EXCEL_EXPORT_FIELDS}
        defaultSelectedKeys={defaultMemberGymExcelExportFieldKeys()}
        hasActiveFilters={hasActiveFilters}
        filteredCount={filteredCount}
        totalCount={totalCount}
        scopeLabels={{
          filtered: (n) => `현재 검색/필터 결과 (${n}개)`,
          all: (n) => `전체 회원사 (${n}개)`,
          allOnly: (n) => `전체 회원사 ${n}개`,
        }}
        emptyScopeMessage="다운로드할 회원사가 없습니다."
        onDownload={async ({ fieldKeys, scope }) => {
          const res = await exportMemberGymsExcelAction({
            fieldKeys,
            scope,
            memberGymIds: scope === "filtered" ? memberGymIds : undefined,
            filters:
              scope === "filtered"
                ? { q: filters.q, status: filters.status }
                : undefined,
          });
          if (!res.ok) {
            return { ok: false as const, message: res.error.message };
          }
          return {
            ok: true as const,
            base64: res.data.base64,
            filename: res.data.filename,
          };
        }}
      />
    </>
  );
}
