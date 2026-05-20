"use client";

import type { ApplicationPdfField } from "@/lib/pdf-editor/application-pdf-field";
import { FieldSourceSelect } from "@/components/domain/application-form-templates/pdf-editor/FieldSourceSelect";
import { Button } from "@/components/ui/button";

export function PdfFieldInspector({
  field,
  onChange,
  onDelete,
  onDuplicate,
}: {
  field: ApplicationPdfField | null;
  onChange: (patch: Partial<ApplicationPdfField>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  if (!field) {
    return (
      <div className="text-muted-foreground rounded-lg border p-4 text-sm">
        PDF 위 필드를 선택하거나 「+ 텍스트」 등으로 추가하세요.
      </div>
    );
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
        <span className="text-muted-foreground text-xs">id</span>
        <input
          value={field.id}
          onChange={(e) => onChange({ id: e.target.value.trim() })}
          className="border-input bg-background w-full rounded-md border px-2 py-1.5 font-mono text-xs"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-muted-foreground text-xs">label</span>
        <input
          value={field.label}
          onChange={(e) => onChange({ label: e.target.value })}
          className="border-input bg-background w-full rounded-md border px-2 py-1.5 text-sm"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-muted-foreground text-xs">type</span>
        <select
          value={field.type}
          onChange={(e) =>
            onChange({ type: e.target.value as ApplicationPdfField["type"] })
          }
          className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
        >
          <option value="text">text</option>
          <option value="signature">signature</option>
          <option value="checkbox">checkbox</option>
          <option value="date">date</option>
        </select>
      </label>

      <label className="block space-y-1">
        <span className="text-muted-foreground text-xs">source</span>
        <FieldSourceSelect
          value={field.source}
          onChange={(v) => onChange({ source: v })}
        />
      </label>

      <div className="grid grid-cols-2 gap-2">
        {(["page", "x", "y", "width", "height"] as const).map((key) => (
          <label key={key} className="block space-y-1">
            <span className="text-muted-foreground text-xs">{key}</span>
            <input
              type="number"
              step="0.01"
              value={field[key]}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (!Number.isFinite(n)) return;
                onChange({ [key]: n });
              }}
              className="border-input bg-background w-full rounded-md border px-2 py-1.5 font-mono text-xs"
            />
          </label>
        ))}
      </div>
      <p className="text-muted-foreground text-[11px] leading-relaxed">
        좌표 단위 pt, 페이지 좌상단(top-left) 기준. PDF overlay 생성 시 bottom-left로
        자동 변환됩니다.
      </p>
    </div>
  );
}

/** 보험 레포 PdfFieldDataMappingControls 패널에 대응 */
export { PdfFieldInspector as PdfFieldMappingPanel };
