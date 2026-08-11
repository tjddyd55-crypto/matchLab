"use client";

import { useCallback, useMemo, useState } from "react";
import {
  type ApplicationPdfField,
  type ApplicationPdfFieldType,
  APPLICATION_PDF_FIELD_TYPE_LABELS,
  createDefaultField,
  duplicateField,
} from "@/lib/pdf-editor/application-pdf-field";
import { PdfPageCanvas } from "@/components/domain/application-form-templates/pdf-editor/PdfPageCanvas";
import { PdfFieldToolbar } from "@/components/domain/application-form-templates/pdf-editor/PdfFieldToolbar";
import { PdfFieldInspector } from "@/components/domain/application-form-templates/pdf-editor/PdfFieldInspector";
import { PdfFieldList } from "@/components/domain/application-form-templates/pdf-editor/PdfFieldList";
import { useAppConfirmDialog } from "@/components/shared/app-confirm-dialog";

/**
 * 관리자 PDF 좌표 편집기.
 * [좌표 목록 220px] [좌표 상세 280px] [PDF 편집 flex-1]
 */
export function PdfCoordinateEditor({
  pdfBytes,
  fields,
  onChange,
}: {
  pdfBytes: ArrayBuffer | null;
  fields: ApplicationPdfField[];
  onChange: (next: ApplicationPdfField[]) => void;
}) {
  const { confirm } = useAppConfirmDialog();
  const [pageIndex, setPageIndex] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [pickMode, setPickMode] = useState(false);
  const [pendingType, setPendingType] = useState<ApplicationPdfFieldType | null>(
    null,
  );
  const [zoom, setZoom] = useState(1);

  const selectedField = useMemo(
    () => fields.find((f) => f.id === selectedFieldId) ?? null,
    [fields, selectedFieldId],
  );

  const existingIds = useMemo(() => new Set(fields.map((f) => f.id)), [fields]);

  const patchField = useCallback(
    (id: string, patch: Partial<ApplicationPdfField>) => {
      onChange(
        fields.map((f) => (f.id === id ? { ...f, ...patch } : f)),
      );
    },
    [fields, onChange],
  );

  const onPickComplete = useCallback(
    (
      rect: Pick<ApplicationPdfField, "x" | "y" | "width" | "height">,
      page: number,
    ) => {
      const type = pendingType ?? "text";
      const next = createDefaultField({
        type,
        page,
        existingIds,
      });
      onChange([...fields, { ...next, ...rect, page }]);
      setSelectedFieldId(next.id);
      setPickMode(false);
      setPendingType(null);
    },
    [existingIds, fields, onChange, pendingType],
  );

  const selectField = useCallback((field: ApplicationPdfField) => {
    setSelectedFieldId(field.id);
    setPageIndex(Math.max(0, field.page - 1));
  }, []);

  if (!pdfBytes) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
        PDF를 먼저 업로드하세요.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
      <aside className="w-full shrink-0 space-y-2 lg:w-[220px]">
        <h3 className="text-xs font-semibold">좌표 목록</h3>
        <PdfFieldList
          fields={fields}
          selectedFieldId={selectedFieldId}
          onSelect={selectField}
        />
      </aside>

      <aside className="w-full shrink-0 lg:w-[280px]">
        <PdfFieldInspector
          field={selectedField}
          existingIds={existingIds}
          onChange={(patch) => {
            if (!selectedFieldId) return;
            if (patch.id && patch.id !== selectedFieldId) {
              setSelectedFieldId(patch.id);
            }
            patchField(selectedFieldId, patch);
          }}
          onDelete={() => {
            if (!selectedFieldId) return;
            void (async () => {
              const ok = await confirm({
                title: "이 필드를 삭제할까요?",
                confirmLabel: "삭제",
                variant: "danger",
              });
              if (!ok) return;
              onChange(fields.filter((f) => f.id !== selectedFieldId));
              setSelectedFieldId(null);
            })();
          }}
          onDuplicate={() => {
            if (!selectedField) return;
            const dup = duplicateField(selectedField, existingIds);
            onChange([...fields, dup]);
            setSelectedFieldId(dup.id);
          }}
        />
      </aside>

      <div className="min-w-0 flex-1 overflow-hidden rounded-lg border">
        <PdfFieldToolbar
          pageIndex={pageIndex}
          pageCount={pageCount}
          zoom={zoom}
          onPageChange={setPageIndex}
          onAddField={(type) => {
            setPendingType(type);
            setPickMode(true);
          }}
          pickMode={pickMode}
          onPickModeChange={(v) => {
            setPickMode(v);
            if (!v) setPendingType(null);
          }}
          onZoomChange={setZoom}
        />
        {pickMode ? (
          <p className="text-muted-foreground border-b px-3 py-2 text-xs">
            PDF 위를 드래그해 필드 영역을 그리세요.
            {pendingType
              ? ` (${APPLICATION_PDF_FIELD_TYPE_LABELS[pendingType]})`
              : ""}
          </p>
        ) : null}
        <div className="p-2">
          <PdfPageCanvas
            pdfBytes={pdfBytes}
            pageIndex={pageIndex}
            fields={fields}
            selectedFieldId={selectedFieldId}
            pickMode={pickMode}
            pendingFieldType={pendingType}
            onSelectField={setSelectedFieldId}
            onFieldRectChange={(id, rect) => patchField(id, rect)}
            onPickComplete={onPickComplete}
            onPageMeta={({ pageCount: c }) => setPageCount(Math.max(1, c))}
            zoom={zoom}
          />
        </div>
      </div>
    </div>
  );
}
