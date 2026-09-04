"use client";

import { useCallback, useMemo, useState } from "react";
import { exportOrganizerApplicationsExcelAction } from "@/features/applications/actions";
import {
  APPLICANT_EXCEL_EXPORT_FIELDS,
  defaultApplicantExcelExportFieldKeys,
} from "@/lib/applications/applicant-excel-export-fields";
import {
  countApplicantsForExcelExport,
  type ApplicantExcelCancellationInclude,
  type ApplicantExcelExportScopeRow,
} from "@/lib/applications/applicant-excel-export-scope";
import {
  ExcelExportTriggerButton,
  SelectableExcelExportDialog,
  type ExcelExportScope,
} from "@/components/shared/excel-export/SelectableExcelExportDialog";
import { Checkbox } from "@/components/ui/checkbox";

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
  applicationRows,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  filteredApplicationIds: string[];
  filteredCount: number;
  totalCount: number;
  hasActiveFilters: boolean;
  applicationRows: ApplicantExcelExportScopeRow[];
}) {
  const [includeGymCancelled, setIncludeGymCancelled] = useState(false);
  const [includeOrganizerCancelled, setIncludeOrganizerCancelled] =
    useState(false);

  const cancellationInclude = useMemo<ApplicantExcelCancellationInclude>(
    () => ({
      includeGymCancelled,
      includeOrganizerCancelled,
    }),
    [includeGymCancelled, includeOrganizerCancelled],
  );

  const filteredIdSet = useMemo(
    () => new Set(filteredApplicationIds),
    [filteredApplicationIds],
  );

  const resolveDownloadCount = useCallback(
    (scope: ExcelExportScope) => {
      const scopeRows =
        scope === "filtered"
          ? applicationRows.filter((row) => filteredIdSet.has(row.applicationId))
          : applicationRows;
      return countApplicantsForExcelExport(scopeRows, cancellationInclude);
    },
    [applicationRows, cancellationInclude, filteredIdSet],
  );

  const scopeAddon = (
    <div className="space-y-2 border-t pt-3">
      <p className="text-sm font-medium">취소 신청자 포함</p>
      <p className="text-muted-foreground text-xs">
        미체크 시 승인·미승인 신청자만 다운로드합니다.
      </p>
      <label className="flex cursor-pointer items-center gap-2 text-sm font-normal">
        <Checkbox
          checked={includeGymCancelled}
          onCheckedChange={(checked) =>
            setIncludeGymCancelled(checked === true)
          }
          aria-label="체육관 취소 신청자 포함"
        />
        체육관 취소 신청자 포함
      </label>
      <label className="flex cursor-pointer items-center gap-2 text-sm font-normal">
        <Checkbox
          checked={includeOrganizerCancelled}
          onCheckedChange={(checked) =>
            setIncludeOrganizerCancelled(checked === true)
          }
          aria-label="주최측 취소 신청자 포함"
        />
        주최측 취소 신청자 포함
      </label>
    </div>
  );

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
      scopeAddon={scopeAddon}
      resolveDownloadCount={resolveDownloadCount}
      onDownload={async ({ fieldKeys, scope }) => {
        const res = await exportOrganizerApplicationsExcelAction({
          eventId,
          fieldKeys,
          scope,
          applicationIds:
            scope === "filtered" ? filteredApplicationIds : undefined,
          includeGymCancelled,
          includeOrganizerCancelled,
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
