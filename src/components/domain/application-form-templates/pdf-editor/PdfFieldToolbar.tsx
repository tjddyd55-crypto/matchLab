"use client";

import type { ApplicationPdfFieldType } from "@/lib/pdf-editor/application-pdf-field";
import { APPLICATION_PDF_FIELD_TYPE_LABELS } from "@/lib/pdf-editor/application-pdf-field";
import { Button } from "@/components/ui/button";

export function PdfFieldToolbar({
  pageIndex,
  pageCount,
  onPageChange,
  onAddField,
  pickMode,
  onPickModeChange,
}: {
  pageIndex: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  onAddField: (type: ApplicationPdfFieldType) => void;
  pickMode: boolean;
  onPickModeChange: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b pb-3">
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pageIndex <= 0}
          onClick={() => onPageChange(pageIndex - 1)}
        >
          이전
        </Button>
        <span className="text-muted-foreground px-2 text-xs">
          {pageIndex + 1} / {pageCount}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pageIndex >= pageCount - 1}
          onClick={() => onPageChange(pageIndex + 1)}
        >
          다음
        </Button>
      </div>
      <span className="text-muted-foreground hidden h-4 w-px bg-border sm:block" />
      {(Object.keys(APPLICATION_PDF_FIELD_TYPE_LABELS) as ApplicationPdfFieldType[]).map(
        (type) => (
          <Button
            key={type}
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onAddField(type)}
          >
            + {APPLICATION_PDF_FIELD_TYPE_LABELS[type]}
          </Button>
        ),
      )}
      <Button
        type="button"
        variant={pickMode ? "default" : "outline"}
        size="sm"
        onClick={() => onPickModeChange(!pickMode)}
      >
        {pickMode ? "영역 그리기 ON" : "영역 그리기"}
      </Button>
    </div>
  );
}
