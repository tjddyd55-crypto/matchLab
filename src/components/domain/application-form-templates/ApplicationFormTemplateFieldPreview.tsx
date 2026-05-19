"use client";

import { useMemo } from "react";
import { pdfFieldSchema } from "@/lib/validators/application-form-template.validator";

export function ApplicationFormTemplateFieldPreview({
  fieldsJson,
}: {
  fieldsJson: string;
}) {
  const fields = useMemo(() => {
    try {
      const parsed = JSON.parse(fieldsJson || "[]") as unknown;
      const result = pdfFieldSchema.array().safeParse(parsed);
      return result.success ? result.data : [];
    } catch {
      return [];
    }
  }, [fieldsJson]);

  if (fields.length === 0) {
    return (
      <p className="text-muted-foreground text-xs">
        fieldsJson을 입력하면 필드 미리보기가 표시됩니다.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-left text-xs">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-3 py-2 font-medium">id</th>
            <th className="px-3 py-2 font-medium">label</th>
            <th className="px-3 py-2 font-medium">page</th>
            <th className="px-3 py-2 font-medium">x,y</th>
            <th className="px-3 py-2 font-medium">size</th>
            <th className="px-3 py-2 font-medium">type</th>
            <th className="px-3 py-2 font-medium">source</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((f) => (
            <tr key={f.id} className="border-t">
              <td className="px-3 py-2 font-mono">{f.id}</td>
              <td className="px-3 py-2">{f.label}</td>
              <td className="px-3 py-2">{f.page}</td>
              <td className="px-3 py-2 font-mono">
                {f.x}, {f.y}
              </td>
              <td className="px-3 py-2 font-mono">
                {f.width}×{f.height}
              </td>
              <td className="px-3 py-2">{f.type}</td>
              <td className="px-3 py-2 font-mono">{f.source}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
