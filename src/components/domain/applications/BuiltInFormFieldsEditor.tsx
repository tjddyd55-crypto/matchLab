"use client";

import { useState } from "react";
import type { BuiltInFormFieldDefinition } from "@/lib/built-in-form/built-in-form-types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FIELD_TYPES = [
  "text",
  "textarea",
  "number",
  "date",
  "select",
  "checkbox",
  "signature",
  "consentText",
] as const;

export function BuiltInFormFieldsEditor({
  initialFields,
  disabled,
  onSave,
}: {
  initialFields: BuiltInFormFieldDefinition[];
  disabled?: boolean;
  onSave: (fields: BuiltInFormFieldDefinition[]) => void;
}) {
  const [fields, setFields] = useState<BuiltInFormFieldDefinition[]>(
    initialFields.length > 0 ? initialFields : [],
  );

  function updateField(index: number, patch: Partial<BuiltInFormFieldDefinition>) {
    setFields((prev) =>
      prev.map((f, i) => (i === index ? { ...f, ...patch } : f)),
    );
  }

  function removeField(index: number) {
    setFields((prev) => prev.filter((_, i) => i !== index));
  }

  function addField() {
    const id = `field_${fields.length + 1}`;
    setFields((prev) => [
      ...prev,
      {
        id,
        label: "새 항목",
        type: "text",
        source: "manual",
        required: false,
        editable: true,
        displayOrder: prev.length,
      },
    ]);
  }

  const inputClass =
    "border-input bg-background h-8 w-full rounded-md border px-2 text-xs";

  if (fields.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-4 text-sm">
        <p className="text-muted-foreground">
          항목이 없습니다. 「기본 신청폼 불러오기」를 사용하거나 항목을
          추가하세요.
        </p>
        <Button
          type="button"
          size="sm"
          className="mt-3"
          disabled={disabled}
          onClick={addField}
        >
          항목 추가
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[48rem] text-left text-xs">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-2 py-2">라벨</th>
              <th className="px-2 py-2">타입</th>
              <th className="px-2 py-2">source</th>
              <th className="px-2 py-2">필수</th>
              <th className="px-2 py-2">수정</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {fields.map((field, index) => (
              <tr key={`${field.id}-${index}`}>
                <td className="px-2 py-2">
                  <input
                    className={inputClass}
                    value={field.label}
                    onChange={(e) =>
                      updateField(index, { label: e.target.value })
                    }
                  />
                </td>
                <td className="px-2 py-2">
                  <select
                    className={inputClass}
                    value={field.type}
                    onChange={(e) =>
                      updateField(index, {
                        type: e.target.value as BuiltInFormFieldDefinition["type"],
                      })
                    }
                  >
                    {FIELD_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-2">
                  <input
                    className={cn(inputClass, "font-mono")}
                    value={field.source}
                    onChange={(e) =>
                      updateField(index, { source: e.target.value })
                    }
                  />
                </td>
                <td className="px-2 py-2">
                  <select
                    className={inputClass}
                    value={String(field.required ?? false)}
                    onChange={(e) => {
                      const v = e.target.value;
                      updateField(index, {
                        required:
                          v === "if_minor"
                            ? "if_minor"
                            : v === "true",
                      });
                    }}
                  >
                    <option value="false">선택</option>
                    <option value="true">필수</option>
                    <option value="if_minor">미성년 시</option>
                  </select>
                </td>
                <td className="px-2 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={field.editable !== false}
                    onChange={(e) =>
                      updateField(index, { editable: e.target.checked })
                    }
                  />
                </td>
                <td className="px-2 py-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => removeField(index)}
                  >
                    삭제
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={addField} disabled={disabled}>
          항목 추가
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={disabled}
          onClick={() => onSave(fields)}
        >
          폼 항목 저장
        </Button>
      </div>
    </div>
  );
}
