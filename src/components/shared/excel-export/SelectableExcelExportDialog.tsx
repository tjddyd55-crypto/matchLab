"use client";

import { useMemo, useState, useTransition } from "react";
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
import { downloadBase64Xlsx } from "@/lib/excel-export/download-client";
import type { SelectableExcelExportFieldOption } from "@/lib/excel-export/types";
import { cn } from "@/lib/utils";

export type ExcelExportScope = "filtered" | "all";

export function ExcelExportTriggerButton({
  onOpen,
  className,
  label = "엑셀 다운로드",
}: {
  onOpen: () => void;
  className?: string;
  label?: string;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className={cn("h-9", className)}
      onClick={onOpen}
    >
      {label}
    </Button>
  );
}

export type SelectableExcelExportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  fields: readonly SelectableExcelExportFieldOption[];
  defaultSelectedKeys: readonly string[];
  hasActiveFilters: boolean;
  filteredCount: number;
  totalCount: number;
  scopeLabels: {
    filtered: (count: number) => string;
    all: (count: number) => string;
    allOnly: (count: number) => string;
  };
  emptyScopeMessage: string;
  onDownload: (input: {
    fieldKeys: string[];
    scope: ExcelExportScope;
  }) => Promise<
    | { ok: true; base64: string; filename: string }
    | { ok: false; message: string }
  >;
};

export function SelectableExcelExportDialog({
  open,
  onOpenChange,
  title,
  description = "다운로드할 항목을 선택해주세요.",
  fields,
  defaultSelectedKeys,
  hasActiveFilters,
  filteredCount,
  totalCount,
  scopeLabels,
  emptyScopeMessage,
  onDownload,
}: SelectableExcelExportDialogProps) {
  const { alert: showAlert } = useAppConfirmDialog();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(
    () => new Set(defaultSelectedKeys),
  );
  const [scope, setScope] = useState<ExcelExportScope>(
    hasActiveFilters ? "filtered" : "all",
  );

  const effectiveScope: ExcelExportScope = hasActiveFilters ? scope : "all";
  const selectedCount = selectedKeys.size;
  const allSelected = selectedCount === fields.length;

  const downloadCount = useMemo(() => {
    if (effectiveScope === "all") return totalCount;
    return filteredCount;
  }, [effectiveScope, totalCount, filteredCount]);

  const canDownload = selectedCount > 0 && downloadCount > 0 && !pending;

  function toggleKey(key: string, checked: boolean) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  function selectAll() {
    setSelectedKeys(new Set(fields.map((f) => f.key)));
  }

  function clearAll() {
    setSelectedKeys(new Set());
  }

  function handleDownload() {
    if (!canDownload) return;
    setError(null);
    startTransition(async () => {
      try {
        const fieldKeys = fields
          .filter((f) => selectedKeys.has(f.key))
          .map((f) => f.key);
        const res = await onDownload({
          fieldKeys,
          scope: effectiveScope,
        });
        if (!res.ok) {
          setError(res.message);
          return;
        }
        downloadBase64Xlsx(res.base64, res.filename);
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
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
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
            {fields.map((field) => {
              const checked = selectedKeys.has(field.key);
              return (
                <label
                  key={field.key}
                  className="hover:bg-muted/40 flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-2 text-sm"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(v) => toggleKey(field.key, v === true)}
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
                  {scopeLabels.filtered(filteredCount)}
                </label>
                <label className="flex cursor-pointer items-center gap-2 font-normal">
                  <input
                    type="radio"
                    name="exportScope"
                    className="accent-primary"
                    checked={scope === "all"}
                    onChange={() => setScope("all")}
                  />
                  {scopeLabels.all(totalCount)}
                </label>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                {scopeLabels.allOnly(totalCount)}
              </p>
            )}
          </div>

          {selectedCount === 0 ? (
            <FeedbackMessage tone="warning">
              최소 1개 이상의 항목을 선택해주세요.
            </FeedbackMessage>
          ) : null}
          {downloadCount === 0 ? (
            <FeedbackMessage tone="warning">{emptyScopeMessage}</FeedbackMessage>
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
          <Button type="button" disabled={!canDownload} onClick={handleDownload}>
            {pending ? "파일 생성 중…" : "다운로드"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
