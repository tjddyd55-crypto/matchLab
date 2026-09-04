"use client";

import { useState } from "react";
import { exportGymMembersExcelAction } from "@/features/gym-members/actions";
import {
  GYM_MEMBER_EXCEL_EXPORT_FIELDS,
  defaultGymMemberExcelExportFieldKeys,
} from "@/lib/gym-member/gym-member-excel-export-fields";
import {
  ExcelExportTriggerButton,
  SelectableExcelExportDialog,
} from "@/components/shared/excel-export/SelectableExcelExportDialog";

export function MemberExcelDownloadButton({
  filters,
  filteredCount,
  totalCount,
  hasActiveFilters,
}: {
  filters: {
    q?: string;
    status?: string;
    fighter?: string;
    expiration?: string;
    joined?: string;
    groupId?: string;
  };
  filteredCount: number;
  totalCount: number;
  hasActiveFilters: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <ExcelExportTriggerButton
        onOpen={() => setOpen(true)}
        className="min-h-8 h-8"
      />
      <SelectableExcelExportDialog
        open={open}
        onOpenChange={setOpen}
        title="엑셀 다운로드"
        fields={GYM_MEMBER_EXCEL_EXPORT_FIELDS}
        defaultSelectedKeys={defaultGymMemberExcelExportFieldKeys()}
        hasActiveFilters={hasActiveFilters}
        filteredCount={filteredCount}
        totalCount={totalCount}
        scopeLabels={{
          filtered: (n) => `현재 검색/필터 결과 (${n}명)`,
          all: (n) => `전체 회원 (${n}명)`,
          allOnly: (n) => `전체 회원 ${n}명`,
        }}
        emptyScopeMessage="다운로드할 회원이 없습니다."
        onDownload={async ({ fieldKeys, scope }) => {
          const res = await exportGymMembersExcelAction({
            fieldKeys,
            scope,
            filters: scope === "filtered" ? filters : undefined,
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
