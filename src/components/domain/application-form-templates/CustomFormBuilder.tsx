"use client";

import { useMemo } from "react";
import type { CustomFormFieldDefinition, CustomFormFieldType } from "@/lib/application-form/custom-form";
import {
  normalizeCustomFormFields,
  suggestFieldId,
  validateCustomFormFieldDefinitions,
} from "@/lib/application-form/custom-form";
import {
  isTemplateEditorDevMode,
  shouldAutoRegenerateFieldId,
} from "@/lib/application-form/template-editor-flags";
import { CUSTOM_FORM_SOURCE_OPTIONS } from "@/lib/application-form/custom-form-sources";
import { CustomFormPreview } from "@/components/domain/application-form-templates/CustomFormPreview";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FIELD_TYPE_OPTIONS: { value: CustomFormFieldType; label: string }[] = [
  { value: "text", label: "단답형" },
  { value: "textarea", label: "장문형" },
  { value: "number", label: "숫자" },
  { value: "date", label: "날짜" },
  { value: "select", label: "선택형(드롭다운)" },
  { value: "radio", label: "선택형(라디오)" },
  { value: "checkbox", label: "체크박스 / 동의" },
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
  const showDevFields = isTemplateEditorDevMode();
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
    const id = suggestFieldId(`항목 ${fields.length + 1}`, ids);
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
    const id = suggestFieldId(`${source.label} 복사`, ids);
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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)] lg:items-start">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">신청 항목</h2>
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
              항목을 추가하고 순서를 조정하세요. 저장 시 체육관 신청 화면에 반영됩니다.
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
                showDevFields={showDevFields}
                onChange={(patch) => updateField(index, patch)}
                onRemove={() => removeField(index)}
                onDuplicate={() => duplicateField(index)}
                onMoveUp={() => moveField(index, -1)}
                onMoveDown={() => moveField(index, 1)}
              />
            ))}
          </div>
        )}
      </div>

      <section className="space-y-2 lg:sticky lg:top-4">
        <h3 className="text-sm font-medium">미리보기</h3>
        <p className="text-muted-foreground text-xs">
          선수·보호자가 보게 될 입력 화면입니다.
        </p>
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
  showDevFields,
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
  showDevFields: boolean;
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
    if (shouldAutoRegenerateFieldId(field.id)) {
      const others = new Set(existingIds);
      others.delete(field.id);
      patch.id = suggestFieldId(label, others);
    }
    onChange(patch);
  };

  return (
    <div className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">
          {index + 1}. {field.label || "새 항목"}
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
        <label className="block space-y-1 text-sm md:col-span-2">
          <span className="font-medium">항목명 *</span>
          <input
            value={field.label}
            onChange={(e) => handleLabelChange(e.target.value)}
            className={fieldClass}
            placeholder="예: 이름, 연락처"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">입력 유형</span>
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
          <span className="font-medium">안내 문구</span>
          <input
            value={field.placeholder ?? ""}
            onChange={(e) => onChange({ placeholder: e.target.value })}
            className={fieldClass}
            placeholder="입력칸에 표시될 안내"
          />
        </label>
        <label className="block space-y-1 text-sm md:col-span-2">
          <span className="font-medium">도움말</span>
          <input
            value={field.helpText ?? ""}
            onChange={(e) => onChange({ helpText: e.target.value })}
            className={fieldClass}
            placeholder="항목 아래에 표시될 설명"
          />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={field.required === true}
          onChange={(e) => onChange({ required: e.target.checked })}
        />
        필수 항목
      </label>

      {showDevFields ? (
        <details className="rounded-lg border border-dashed p-3 text-sm">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
            개발자 설정
          </summary>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-xs font-medium">항목 ID</span>
              <input
                value={field.id}
                onChange={(e) => onChange({ id: e.target.value })}
                className={cn(fieldClass, "font-mono text-xs")}
                spellCheck={false}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium">자동 입력 (source)</span>
              <select
                value={field.source ?? ""}
                onChange={(e) =>
                  onChange({
                    source: e.target.value === "" ? null : e.target.value,
                    readonly: e.target.value ? true : field.readonly,
                  })
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
          </div>
        </details>
      ) : null}

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
      <p className="text-sm font-medium">선택 옵션</p>
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
