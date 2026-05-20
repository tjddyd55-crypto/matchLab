"use client";

import { useCallback, useMemo, useState } from "react";
import {
  type ApplicationPdfField,
  type ApplicationPdfFieldType,
  APPLICATION_PDF_FIELD_TYPE_LABELS,
  createDefaultField,
  duplicateField,
} from "@/lib/pdf-editor/application-pdf-field";
import { labelForApplicationFieldSource } from "@/lib/pdf-editor/application-field-sources";
import { PdfPageCanvas } from "@/components/domain/application-form-templates/pdf-editor/PdfPageCanvas";
import { PdfFieldToolbar } from "@/components/domain/application-form-templates/pdf-editor/PdfFieldToolbar";
import { PdfFieldInspector } from "@/components/domain/application-form-templates/pdf-editor/PdfFieldInspector";
import { cn } from "@/lib/utils";

/**
 * 관리자 PDF 좌표 편집기.
 * 보험 레포 PdfCoordinateEditor + PdfOverlayCanvas UX를 참고해
 * ApplicationFormTemplate.fieldsJson(top-left pt) 구조에 맞게 로컬화.
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
  const [pageIndex, setPageIndex] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [pickMode, setPickMode] = useState(false);
  const [pendingType, setPendingType] = useState<ApplicationPdfFieldType | null>(
    null,
  );

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

  const pageFields = fields.filter((f) => f.page === pageIndex + 1);

  return (
    <div className="space-y-4">
      <PdfFieldToolbar
        pageIndex={pageIndex}
        pageCount={pageCount}
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
      />
      {pickMode ? (
        <p className="text-muted-foreground text-xs">
          PDF 위를 드래그해 필드 영역을 그리세요.
          {pendingType
            ? ` (${APPLICATION_PDF_FIELD_TYPE_LABELS[pendingType]})`
            : ""}
        </p>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[200px_minmax(0,1fr)_260px]">
        <aside className="space-y-2">
          <h3 className="text-xs font-semibold">필드 목록</h3>
          <ul className="max-h-[480px] space-y-1 overflow-y-auto text-xs">
            {fields.length === 0 ? (
              <li className="text-muted-foreground">필드 없음</li>
            ) : (
              fields.map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    className={cn(
                      "w-full rounded-md border px-2 py-1.5 text-left",
                      f.id === selectedFieldId
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50",
                    )}
                    onClick={() => {
                      setSelectedFieldId(f.id);
                      setPageIndex(Math.max(0, f.page - 1));
                    }}
                  >
                    <div className="font-medium">{f.label}</div>
                    <div className="text-muted-foreground font-mono">
                      p{f.page} · {f.type}
                    </div>
                    <div className="text-muted-foreground truncate">
                      {labelForApplicationFieldSource(f.source)}
                    </div>
                  </button>
                </li>
              ))
            )}
          </ul>
          <p className="text-muted-foreground text-[11px]">
            현재 페이지 필드: {pageFields.length}개
          </p>
        </aside>

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
        />

        <PdfFieldInspector
          field={selectedField}
          onChange={(patch) => {
            if (!selectedFieldId) return;
            if (patch.id && patch.id !== selectedFieldId) {
              setSelectedFieldId(patch.id);
            }
            patchField(selectedFieldId, patch);
          }}
          onDelete={() => {
            if (!selectedFieldId) return;
            if (!window.confirm("이 필드를 삭제할까요?")) return;
            onChange(fields.filter((f) => f.id !== selectedFieldId));
            setSelectedFieldId(null);
          }}
          onDuplicate={() => {
            if (!selectedField) return;
            const dup = duplicateField(selectedField, existingIds);
            onChange([...fields, dup]);
            setSelectedFieldId(dup.id);
          }}
        />
      </div>
    </div>
  );
}
