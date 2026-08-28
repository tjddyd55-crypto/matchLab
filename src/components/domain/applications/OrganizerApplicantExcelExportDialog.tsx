"use client";

import { useMemo, useState, useTransition } from "react";
import { exportOrganizerApplicationsExcelAction } from "@/features/applications/actions";
import {
  APPLICANT_EXCEL_EXPORT_FIELDS,
  defaultApplicantExcelExportFieldKeys,
  type ApplicantExcelExportFieldKey,
} from "@/lib/applications/applicant-excel-export-fields";
import { useAppConfirmDialog } from "@/components/shared/app-confirm-dialog";
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type ExportScope = "filtered" | "all";

export function OrganizerApplicantExcelExportTrigger({
  onOpen,
  className,
}: {
  onOpen: () => void;
  className?: string;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className={cn("h-9", className)}
      onClick={onOpen}
    >
      엑셀 다운로드
    </Button>
  );
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
  const { alert: showAlert } = useAppConfirmDialog();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<
    Set<ApplicantExcelExportFieldKey>
  >(() => new Set(defaultApplicantExcelExportFieldKeys()));
  const [scope, setScope] = useState<ExportScope>(
    hasActiveFilters ? "filtered" : "all",
  );

  // 필터가 없으면 항상 전체 범위
  const effectiveScope: ExportScope = hasActiveFilters ? scope : "all";

  const selectedCount = selectedKeys.size;
  const allSelected = selectedCount === APPLICANT_EXCEL_EXPORT_FIELDS.length;

  const downloadCount = useMemo(() => {
    if (effectiveScope === "all") return totalCount;
    return filteredCount;
  }, [effectiveScope, totalCount, filteredCount]);

  const canDownload = selectedCount > 0 && downloadCount > 0 && !pending;

  function toggleKey(key: ApplicantExcelExportFieldKey, checked: boolean) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  function selectAll() {
    setSelectedKeys(
      new Set(APPLICANT_EXCEL_EXPORT_FIELDS.map((f) => f.key)),
    );
  }

  function clearAll() {
    setSelectedKeys(new Set());
  }

  function handleDownload() {
    if (!canDownload) return;
    setError(null);
    startTransition(async () => {
      try {
        const fieldKeys = APPLICANT_EXCEL_EXPORT_FIELDS.filter((f) =>
          selectedKeys.has(f.key),
        ).map((f) => f.key);
        const res = await exportOrganizerApplicationsExcelAction({
          eventId,
          fieldKeys,
          scope: effectiveScope,
          applicationIds:
            effectiveScope === "filtered" ? filteredApplicationIds : undefined,
        });
        if (!res.ok) {
          setError(res.error.message);
          return;
        }
        const binary = atob(res.data.base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([bytes], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = res.data.filename;
        a.click();
        URL.revokeObjectURL(url);
        onOpenChange(false);
      } catch {
        setError("엑셀 파일을 생성하지 못했습니다. 다시 시도해주세요.");
        await showAlert({
          title: "다운로드 실패",
          description: "엑셀 파일을 생성하지 못했습니다. 다시 시도해주세요.",
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,720px)] w-[min(560px,calc(100vw-1.5rem))] flex-col gap-0 overflow-hidden p-0 sm:max-w-[560px]">
        <DialogHeader className="shrink-0 border-b px-4 py-3 pr-12">
          <DialogTitle>엑셀 다운로드</DialogTitle>
          <DialogDescription>
            다운로드할 항목을 선택해주세요.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">
              다운로드 항목 · {selectedCount}개 선택
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8"
                onClick={selectAll}
                disabled={allSelected}
              >
                전체 선택
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8"
                onClick={clearAll}
                disabled={selectedCount === 0}
              >
                전체 해제
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {APPLICANT_EXCEL_EXPORT_FIELDS.map((field) => {
              const checked = selectedKeys.has(field.key);
              return (
                <label
                  key={field.key}
                  className="hover:bg-muted/40 flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-2 text-sm"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(v) =>
                      toggleKey(field.key, v === true)
                    }
                    aria-label={field.label}
                  />
                  <span className="min-w-0 truncate">{field.label}</span>
                </label>
              );
            })}
          </div>

          <div className="space-y-2 border-t pt-3">
            <p className="text-sm font-medium">다운로드 범위</p>
            {hasActiveFilters ? (
              <div className="space-y-2 text-sm">
                <label className="flex cursor-pointer items-center gap-2 font-normal">
                  <input
                    type="radio"
                    name="exportScope"
                    className="accent-primary"
                    checked={scope === "filtered"}
                    onChange={() => setScope("filtered")}
                  />
                  현재 검색/필터 결과 ({filteredCount}명)
                </label>
                <label className="flex cursor-pointer items-center gap-2 font-normal">
                  <input
                    type="radio"
                    name="exportScope"
                    className="accent-primary"
                    checked={scope === "all"}
                    onChange={() => setScope("all")}
                  />
                  전체 신청자 ({totalCount}명)
                </label>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                전체 신청자 {totalCount}명
              </p>
            )}
          </div>

          {selectedCount === 0 ? (
            <FeedbackMessage tone="warning">
              최소 1개 이상의 항목을 선택해주세요.
            </FeedbackMessage>
          ) : null}
          {downloadCount === 0 ? (
            <FeedbackMessage tone="warning">
              다운로드할 신청자가 없습니다.
            </FeedbackMessage>
          ) : null}
          {error ? (
            <FeedbackMessage tone="error" role="alert">
              {error}
            </FeedbackMessage>
          ) : null}
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t px-4 py-3 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            취소
          </Button>
          <Button
            type="button"
            disabled={!canDownload}
            onClick={handleDownload}
          >
            {pending ? "파일 생성 중…" : "다운로드"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
