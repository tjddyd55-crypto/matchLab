"use client";

import { useMemo } from "react";
import type { IntakeFormFieldType } from "@/generated/prisma";
import {
  normalizeIntakeFormFields,
  suggestIntakeFormFieldKey,
  validateIntakeFormFieldDefinitions,
  type IntakeFormFieldDefinition,
} from "@/lib/intake-form/fields";
import { INTAKE_FORM_FIELD_TYPE_LABEL } from "@/lib/intake-form/ui-labels";
import { INTAKE_FORM_FIELD_TYPES } from "@/lib/intake-form/field-types";
import { IntakeFormFieldRenderer } from "@/components/domain/intake-forms/IntakeFormFieldRenderer";
import { Button } from "@/components/ui/button";
import { matchonFieldInputClass } from "@/lib/ui/matchon-shell-ui";
import { cn } from "@/lib/utils";

const fieldClass = matchonFieldInputClass;

export function IntakeFormBuilder({
  fields,
  onChange,
  validationError,
}: {
  fields: IntakeFormFieldDefinition[];
  onChange: (fields: IntakeFormFieldDefinition[]) => void;
  validationError?: string | null;
}) {
  const normalized = useMemo(() => normalizeIntakeFormFields(fields), [fields]);
  const localValidation = useMemo(
    () =>
      fields.length > 0 ? validateIntakeFormFieldDefinitions(normalized) : null,
    [fields.length, normalized],
  );

  const updateField = (
    index: number,
    patch: Partial<IntakeFormFieldDefinition>,
  ) => {
    onChange(fields.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  };

  const addField = () => {
    const keys = new Set(fields.map((f) => f.stableKey));
    const label = `항목 ${fields.length + 1}`;
    const stableKey = suggestIntakeFormFieldKey(label, keys);
    onChange([
      ...fields,
      {
        stableKey,
        label,
        type: "text",
        required: false,
        displayOrder: fields.length + 1,
      },
    ]);
  };

  const moveField = (index: number, dir: -1 | 1) => {
    const target = index + dir;
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
          <h2 className="text-sm font-semibold">입력 항목</h2>
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
            항목을 추가해 신청 폼을 구성하세요.
          </p>
        ) : (
          <div className="space-y-4">
            {fields.map((field, index) => (
              <div
                key={`${field.stableKey}-${index}`}
                className="space-y-3 rounded-xl border border-matchon-border bg-white p-4"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1 text-sm">
                    <span className="font-medium">라벨</span>
                    <input
                      value={field.label}
                      onChange={(e) =>
                        updateField(index, { label: e.target.value })
                      }
                      className={fieldClass}
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="font-medium">입력 유형</span>
                    <select
                      value={field.type}
                      onChange={(e) =>
                        updateField(index, {
                          type: e.target.value as IntakeFormFieldType,
                        })
                      }
                      className={fieldClass}
                    >
                      {INTAKE_FORM_FIELD_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {INTAKE_FORM_FIELD_TYPE_LABEL[t]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1 text-sm">
                    <span className="font-medium">placeholder</span>
                    <input
                      value={field.placeholder ?? ""}
                      onChange={(e) =>
                        updateField(index, { placeholder: e.target.value })
                      }
                      className={fieldClass}
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="font-medium">도움말</span>
                    <input
                      value={field.helpText ?? ""}
                      onChange={(e) =>
                        updateField(index, { helpText: e.target.value })
                      }
                      className={fieldClass}
                    />
                  </label>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={field.required === true}
                    onChange={(e) =>
                      updateField(index, { required: e.target.checked })
                    }
                  />
                  필수
                </label>
                {(field.type === "radio" ||
                  field.type === "select" ||
                  field.type === "checkbox_group") && (
                  <OptionEditor
                    options={field.options ?? []}
                    onChange={(options) => updateField(index, { options })}
                  />
                )}
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={index === 0}
                    onClick={() => moveField(index, -1)}
                  >
                    위로
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={index === fields.length - 1}
                    onClick={() => moveField(index, 1)}
                  >
                    아래로
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      onChange(fields.filter((_, i) => i !== index))
                    }
                  >
                    삭제
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <section className="space-y-2 lg:sticky lg:top-4">
        <h2 className="text-sm font-semibold">미리보기</h2>
        <div className="space-y-3 rounded-xl border border-matchon-border bg-white p-4">
          {normalized.length === 0 ? (
            <p className="text-muted-foreground text-sm">미리보기 항목 없음</p>
          ) : (
            normalized.map((field) => (
              <IntakeFormFieldRenderer
                key={field.stableKey}
                field={{ ...field, required: field.required === true }}
                value={undefined}
                disabled
                namePrefix="preview-"
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function OptionEditor({
  options,
  onChange,
}: {
  options: string[];
  onChange: (options: string[]) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-matchon-text-secondary">선택지</p>
      {options.map((opt, i) => (
        <div key={i} className="flex gap-2">
          <input
            value={opt}
            onChange={(e) => {
              const next = [...options];
              next[i] = e.target.value;
              onChange(next);
            }}
            className={cn(fieldClass, "flex-1")}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange(options.filter((_, j) => j !== i))}
          >
            삭제
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => onChange([...options, `선택지 ${options.length + 1}`])}
      >
        + 선택지
      </Button>
    </div>
  );
}
