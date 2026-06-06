"use client";

import { useMemo } from "react";
import type { CustomFormFieldDefinition, CustomFormFieldType } from "@/lib/application-form/custom-form";
import {
  normalizeCustomFormFields,
  suggestFieldId,
  validateCustomFormFieldDefinitions,
} from "@/lib/application-form/custom-form";
import { CUSTOM_FORM_SOURCE_OPTIONS } from "@/lib/application-form/custom-form-sources";
import { CustomFormPreview } from "@/components/domain/application-form-templates/CustomFormPreview";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FIELD_TYPE_OPTIONS: { value: CustomFormFieldType; label: string }[] = [
  { value: "text", label: "한 줄 텍스트" },
  { value: "textarea", label: "여러 줄 텍스트" },
  { value: "number", label: "숫자" },
  { value: "date", label: "날짜" },
  { value: "select", label: "선택(드롭다운)" },
  { value: "radio", label: "선택(라디오)" },
  { value: "checkbox", label: "체크박스" },
];

const fieldClass = cn(
  "border-input bg-background w-full rounded-md border px-3 py-2 text-sm shadow-sm",
);

export function CustomFormBuilder({
  fields,
  onChange,
  validationError,
}: {
  fields: CustomFormFieldDefinition[];
  onChange: (fields: CustomFormFieldDefinition[]) => void;
  validationError?: string | null;
}) {
  const normalizedFields = useMemo(
    () => normalizeCustomFormFields(fields),
    [fields],
  );
  const localValidation = useMemo(
    () => (fields.length > 0 ? validateCustomFormFieldDefinitions(normalizedFields) : null),
    [fields.length, normalizedFields],
  );

  const updateField = (index: number, patch: Partial<CustomFormFieldDefinition>) => {
    const next = fields.map((field, i) =>
      i === index ? { ...field, ...patch } : field,
    );
    onChange(next);
  };

  const addField = () => {
    const ids = new Set(fields.map((f) => f.id));
    const id = suggestFieldId(`field_${fields.length + 1}`, ids);
    onChange([
      ...fields,
      {
        id,
        label: `항목 ${fields.length + 1}`,
        type: "text",
        required: false,
        readonly: false,
        source: null,
        displayOrder: fields.length + 1,
      },
    ]);
  };

  const removeField = (index: number) => {
    onChange(fields.filter((_, i) => i !== index));
  };

  const duplicateField = (index: number) => {
    const source = fields[index];
    if (!source) return;
    const ids = new Set(fields.map((f) => f.id));
    const id = suggestFieldId(`${source.id}_copy`, ids);
    const copy: CustomFormFieldDefinition = {
      ...source,
      id,
      label: `${source.label} (복제)`,
    };
    const next = [...fields];
    next.splice(index + 1, 0, copy);
    onChange(next);
  };

  const moveField = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= fields.length) return;
    const next = [...fields];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    onChange(next);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">자체 폼 항목</h2>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            항목을 추가·편집하면 체육관 일괄 신청 화면에 그대로 반영됩니다.
          </p>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={addField}>
          항목 추가
        </Button>
      </div>

      {validationError || localValidation ? (
        <p className="text-destructive text-sm" role="alert">
          {validationError ?? localValidation}
        </p>
      ) : null}

      {fields.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
          아직 항목이 없습니다. 「항목 추가」로 시작하세요.
        </p>
      ) : (
        <div className="space-y-4">
          {fields.map((field, index) => (
            <FieldEditorCard
              key={`${field.id}-${index}`}
              field={field}
              index={index}
              total={fields.length}
              existingIds={new Set(fields.map((f) => f.id))}
              onChange={(patch) => updateField(index, patch)}
              onRemove={() => removeField(index)}
              onDuplicate={() => duplicateField(index)}
              onMoveUp={() => moveField(index, -1)}
              onMoveDown={() => moveField(index, 1)}
            />
          ))}
        </div>
      )}

      <section className="space-y-2">
        <h3 className="text-sm font-medium">미리보기</h3>
        <CustomFormPreview fields={normalizedFields} />
      </section>
    </div>
  );
}

function FieldEditorCard({
  field,
  index,
  total,
  existingIds,
  onChange,
  onRemove,
  onDuplicate,
  onMoveUp,
  onMoveDown,
}: {
  field: CustomFormFieldDefinition;
  index: number;
  total: number;
  existingIds: Set<string>;
  onChange: (patch: Partial<CustomFormFieldDefinition>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const needsOptions =
    field.type === "select" ||
    field.type === "radio" ||
    (field.type === "checkbox" && (field.options?.length ?? 0) > 0);

  const handleLabelChange = (label: string) => {
    const patch: Partial<CustomFormFieldDefinition> = { label };
    if (!field.id || field.id.startsWith("field")) {
      const others = new Set(existingIds);
      others.delete(field.id);
      patch.id = suggestFieldId(label, others);
    }
    onChange(patch);
  };

  const handleSourceChange = (source: string | null) => {
    onChange({
      source,
      readonly: source ? field.readonly !== false : field.readonly,
    });
  };

  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">
          #{index + 1} {field.label || "새 항목"}
        </p>
        <div className="flex flex-wrap gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={onMoveUp} disabled={index === 0}>
            ↑
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onMoveDown}
            disabled={index >= total - 1}
          >
            ↓
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onDuplicate}>
            복제
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
            삭제
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block space-y-1 text-sm">
          <span className="font-medium">라벨 *</span>
          <input
            value={field.label}
            onChange={(e) => handleLabelChange(e.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">항목 ID *</span>
          <input
            value={field.id}
            onChange={(e) => onChange({ id: e.target.value })}
            className={cn(fieldClass, "font-mono text-xs")}
            spellCheck={false}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">타입</span>
          <select
            value={field.type}
            onChange={(e) =>
              onChange({
                type: e.target.value as CustomFormFieldType,
                options:
                  e.target.value === "select" || e.target.value === "radio"
                    ? field.options ?? ["옵션 1"]
                    : undefined,
              })
            }
            className={fieldClass}
          >
            {FIELD_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">자동 입력 (source)</span>
          <select
            value={field.source ?? ""}
            onChange={(e) =>
              handleSourceChange(e.target.value === "" ? null : e.target.value)
            }
            className={fieldClass}
          >
            {CUSTOM_FORM_SOURCE_OPTIONS.map((opt) => (
              <option key={opt.label} value={opt.value ?? ""}>
                [{opt.group}] {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">placeholder</span>
          <input
            value={field.placeholder ?? ""}
            onChange={(e) => onChange({ placeholder: e.target.value })}
            className={fieldClass}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">도움말</span>
          <input
            value={field.helpText ?? ""}
            onChange={(e) => onChange({ helpText: e.target.value })}
            className={fieldClass}
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={field.required === true}
            onChange={(e) => onChange({ required: e.target.checked })}
          />
          필수
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={field.readonly === true}
            onChange={(e) => onChange({ readonly: e.target.checked })}
          />
          읽기 전용
          {field.source ? (
            <span className="text-muted-foreground text-xs">(자동 입력 시 권장)</span>
          ) : null}
        </label>
      </div>

      {needsOptions || field.type === "select" || field.type === "radio" ? (
        <OptionsEditor
          options={field.options ?? []}
          onChange={(options) => onChange({ options })}
        />
      ) : null}
    </div>
  );
}

function OptionsEditor({
  options,
  onChange,
}: {
  options: string[];
  onChange: (options: string[]) => void;
}) {
  const rows = options.length > 0 ? options : [""];

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">옵션 목록</p>
      {rows.map((opt, index) => (
        <div key={index} className="flex gap-2">
          <input
            value={opt}
            onChange={(e) => {
              const next = [...rows];
              next[index] = e.target.value;
              onChange(next.filter((v, i) => v.trim() || i < next.length - 1));
            }}
            className={fieldClass}
            placeholder={`옵션 ${index + 1}`}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(rows.filter((_, i) => i !== index))}
            disabled={rows.length <= 1}
          >
            삭제
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => onChange([...rows, ""])}
      >
        옵션 추가
      </Button>
    </div>
  );
}
