"use client";

import type { ApplicationPdfField } from "@/lib/pdf-editor/application-pdf-field";
import {
  APPLICATION_PDF_FIELD_TYPE_LABELS,
  defaultSourceForType,
} from "@/lib/pdf-editor/application-pdf-field";
import { genFieldIdFromLabel } from "@/lib/pdf-editor/pdf-field-id";
import {
  isTemplateEditorDevMode,
  shouldAutoRegenerateFieldId,
} from "@/lib/application-form/template-editor-flags";
import { FieldSourceSelect } from "@/components/domain/application-form-templates/pdf-editor/FieldSourceSelect";
import { Button } from "@/components/ui/button";

export function PdfFieldInspector({
  field,
  existingIds,
  onChange,
  onDelete,
  onDuplicate,
}: {
  field: ApplicationPdfField | null;
  existingIds: ReadonlySet<string>;
  onChange: (patch: Partial<ApplicationPdfField>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const showDevFields = isTemplateEditorDevMode();

  if (!field) {
    return (
      <div className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm leading-relaxed">
        PDF 위 필드를 선택하거나 「+ 텍스트」 등으로 영역을 추가하세요.
      </div>
    );
  }

  function handleLabelChange(label: string) {
    const patch: Partial<ApplicationPdfField> = { label };
    if (shouldAutoRegenerateFieldId(field!.id)) {
      const others = new Set(existingIds);
      others.delete(field!.id);
      patch.id = genFieldIdFromLabel(label, others);
    }
    onChange(patch);
  }

  function handleTypeChange(type: ApplicationPdfField["type"]) {
    onChange({
      type,
      source: defaultSourceForType(type),
    });
  }

  return (
    <div className="space-y-3 rounded-lg border p-4 text-sm">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">필드 설정</h3>
        <div className="flex gap-1">
          <Button type="button" variant="outline" size="sm" onClick={onDuplicate}>
            복제
          </Button>
          <Button type="button" variant="destructive" size="sm" onClick={onDelete}>
            삭제
          </Button>
        </div>
      </div>

      <label className="block space-y-1">
        <span className="text-xs font-medium">항목명</span>
        <input
          value={field.label}
          onChange={(e) => handleLabelChange(e.target.value)}
          className="border-input bg-background w-full rounded-md border px-2 py-1.5 text-sm"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs font-medium">입력 유형</span>
        <select
          value={field.type}
          onChange={(e) =>
            handleTypeChange(e.target.value as ApplicationPdfField["type"])
          }
          className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
        >
          {(Object.keys(APPLICATION_PDF_FIELD_TYPE_LABELS) as ApplicationPdfField["type"][]).map(
            (type) => (
              <option key={type} value={type}>
                {APPLICATION_PDF_FIELD_TYPE_LABELS[type]}
              </option>
            ),
          )}
        </select>
      </label>

      <details className="rounded-md border border-dashed p-2">
        <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
          위치 및 크기
        </summary>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="block space-y-1">
            <span className="text-muted-foreground text-xs">페이지</span>
            <input
              type="number"
              min={1}
              value={field.page}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (!Number.isFinite(n)) return;
                onChange({ page: n });
              }}
              className="border-input bg-background w-full rounded-md border px-2 py-1.5 text-xs"
            />
          </label>
          {(["x", "y", "width", "height"] as const).map((key) => (
            <label key={key} className="block space-y-1">
              <span className="text-muted-foreground text-xs">
                {key === "x"
                  ? "X"
                  : key === "y"
                    ? "Y"
                    : key === "width"
                      ? "너비"
                      : "높이"}
              </span>
              <input
                type="number"
                step="0.01"
                value={field[key]}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (!Number.isFinite(n)) return;
                  onChange({ [key]: n });
                }}
                className="border-input bg-background w-full rounded-md border px-2 py-1.5 text-xs"
              />
            </label>
          ))}
        </div>
      </details>

      {showDevFields ? (
        <details className="rounded-md border border-dashed p-2">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
            개발자 설정
          </summary>
          <div className="mt-2 space-y-2">
            <label className="block space-y-1">
              <span className="text-xs">항목 ID</span>
              <input
                value={field.id}
                onChange={(e) => onChange({ id: e.target.value.trim() })}
                className="border-input bg-background w-full rounded-md border px-2 py-1.5 font-mono text-xs"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs">source</span>
              <FieldSourceSelect
                value={field.source}
                onChange={(v) => onChange({ source: v })}
              />
            </label>
          </div>
        </details>
      ) : null}
    </div>
  );
}

/** 보험 레포 PdfFieldDataMappingControls 패널에 대응 */
export { PdfFieldInspector as PdfFieldMappingPanel };
