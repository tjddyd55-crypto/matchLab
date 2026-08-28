"use client";

import { exportOrganizerApplicationsExcelAction } from "@/features/applications/actions";
import {
  APPLICANT_EXCEL_EXPORT_FIELDS,
  defaultApplicantExcelExportFieldKeys,
} from "@/lib/applications/applicant-excel-export-fields";
import {
  ExcelExportTriggerButton,
  SelectableExcelExportDialog,
} from "@/components/shared/excel-export/SelectableExcelExportDialog";

export function OrganizerApplicantExcelExportTrigger({
  onOpen,
  className,
}: {
  onOpen: () => void;
  className?: string;
}) {
  return <ExcelExportTriggerButton onOpen={onOpen} className={className} />;
}

export function OrganizerApplicantExcelExportDialog({
  open,
  onOpenChange,
  eventId,
  filteredApplicationIds,
  filteredCount,
  totalCount,
  hasActiveFilters,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  filteredApplicationIds: string[];
  filteredCount: number;
  totalCount: number;
  hasActiveFilters: boolean;
}) {
  return (
    <SelectableExcelExportDialog
      open={open}
      onOpenChange={onOpenChange}
      title="엑셀 다운로드"
      fields={APPLICANT_EXCEL_EXPORT_FIELDS}
      defaultSelectedKeys={defaultApplicantExcelExportFieldKeys()}
      hasActiveFilters={hasActiveFilters}
      filteredCount={filteredCount}
      totalCount={totalCount}
      scopeLabels={{
        filtered: (n) => `현재 검색/필터 결과 (${n}명)`,
        all: (n) => `전체 신청자 (${n}명)`,
        allOnly: (n) => `전체 신청자 ${n}명`,
      }}
      emptyScopeMessage="다운로드할 신청자가 없습니다."
      onDownload={async ({ fieldKeys, scope }) => {
        const res = await exportOrganizerApplicationsExcelAction({
          eventId,
          fieldKeys,
          scope,
          applicationIds:
            scope === "filtered" ? filteredApplicationIds : undefined,
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
  );
}
