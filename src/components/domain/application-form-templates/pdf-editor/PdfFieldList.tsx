"use client";

import type { ApplicationPdfField } from "@/lib/pdf-editor/application-pdf-field";
import { APPLICATION_PDF_FIELD_TYPE_LABELS } from "@/lib/pdf-editor/application-pdf-field";
import { cn } from "@/lib/utils";

export function PdfFieldList({
  fields,
  selectedFieldId,
  onSelect,
}: {
  fields: ApplicationPdfField[];
  selectedFieldId: string | null;
  onSelect: (field: ApplicationPdfField) => void;
}) {
  if (fields.length === 0) {
    return (
      <p className="text-muted-foreground text-xs leading-relaxed">
        등록된 좌표가 없습니다.
        <br />
        PDF 영역에서 「+ 텍스트」 등으로 추가하세요.
      </p>
    );
  }

  return (
    <ul className="max-h-[min(560px,60vh)] space-y-1 overflow-y-auto text-xs">
      {fields.map((f) => (
        <li key={f.id}>
          <button
            type="button"
            className={cn(
              "w-full rounded-md border px-2.5 py-2 text-left transition-colors",
              f.id === selectedFieldId
                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                : "hover:bg-muted/60",
            )}
            onClick={() => onSelect(f)}
          >
            <div className="font-medium">{f.label}</div>
            <div className="text-muted-foreground mt-0.5">
              p{f.page} · {APPLICATION_PDF_FIELD_TYPE_LABELS[f.type]}
            </div>
            <div className="text-muted-foreground mt-0.5 truncate">
              {f.source}
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
