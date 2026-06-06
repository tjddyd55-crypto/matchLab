"use client";

import type { CustomFormFieldDefinition } from "@/lib/application-form/custom-form";
import { cn } from "@/lib/utils";

export type CustomFormAnswers = Record<string, unknown>;

export function isCustomFormComplete(
  fields: CustomFormFieldDefinition[],
  answers: CustomFormAnswers,
): boolean {
  for (const field of fields) {
    if (field.source || field.readonly || !field.required) continue;
    const raw = answers[field.id];
    if (field.type === "checkbox") {
      if (raw !== true && raw !== "true" && raw !== "on") return false;
      continue;
    }
    const text = raw == null ? "" : String(raw).trim();
    if (!text) return false;
  }
  return true;
}

export function GymCustomFormFields({
  fields,
  answers,
  onChange,
  disabled,
  className,
}: {
  fields: CustomFormFieldDefinition[];
  answers: CustomFormAnswers;
  onChange: (answers: CustomFormAnswers) => void;
  disabled?: boolean;
  className?: string;
}) {
  if (fields.length === 0) return null;

  const setValue = (id: string, value: unknown) => {
    onChange({ ...answers, [id]: value });
  };

  return (
    <div className={cn("grid gap-3 rounded-lg border border-border/70 bg-muted/10 p-3", className)}>
      <p className="text-xs font-medium">신청서 항목</p>
      {fields.map((field) => {
        const inputId = `custom-form-${field.id}`;
        const readonly = Boolean(field.readonly || field.source);
        const displayValue = readonly
          ? "(자동 입력)"
          : answers[field.id] == null
            ? ""
            : String(answers[field.id]);

        if (readonly) {
          return (
            <div key={field.id} className="grid gap-1">
              <span className="text-muted-foreground text-xs">{field.label}</span>
              <div className="text-sm">{displayValue || "—"}</div>
            </div>
          );
        }

        if (field.type === "textarea") {
          return (
            <label key={field.id} className="grid gap-1 text-sm">
              <span>
                {field.label}
                {field.required ? <span className="text-destructive"> *</span> : null}
              </span>
              {field.helpText ? (
                <span className="text-muted-foreground text-xs">{field.helpText}</span>
              ) : null}
              <textarea
                id={inputId}
                disabled={disabled}
                required={field.required}
                rows={3}
                placeholder={field.placeholder}
                value={displayValue}
                onChange={(e) => setValue(field.id, e.target.value)}
                className="border-input bg-background min-h-[72px] w-full rounded-lg border px-3 py-2 text-sm"
              />
            </label>
          );
        }

        if (field.type === "checkbox") {
          return (
            <label
              key={field.id}
              className="flex cursor-pointer items-start gap-2 text-sm"
            >
              <input
                id={inputId}
                type="checkbox"
                disabled={disabled}
                checked={answers[field.id] === true}
                onChange={(e) => setValue(field.id, e.target.checked)}
                className="mt-1 size-4 accent-primary"
              />
              <span>
                {field.label}
                {field.required ? <span className="text-destructive"> *</span> : null}
              </span>
            </label>
          );
        }

        if (field.type === "select") {
          return (
            <label key={field.id} className="grid gap-1 text-sm">
              <span>
                {field.label}
                {field.required ? <span className="text-destructive"> *</span> : null}
              </span>
              <select
                id={inputId}
                disabled={disabled}
                required={field.required}
                value={displayValue}
                onChange={(e) => setValue(field.id, e.target.value)}
                className="border-input bg-background h-10 w-full rounded-lg border px-3 text-sm"
              >
                <option value="">선택</option>
                {(field.options ?? []).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>
          );
        }

        if (field.type === "radio") {
          return (
            <fieldset key={field.id} className="grid gap-2 text-sm">
              <legend>
                {field.label}
                {field.required ? <span className="text-destructive"> *</span> : null}
              </legend>
              <div className="flex flex-wrap gap-3">
                {(field.options ?? []).map((opt) => (
                  <label key={opt} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={inputId}
                      disabled={disabled}
                      checked={answers[field.id] === opt}
                      onChange={() => setValue(field.id, opt)}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </fieldset>
          );
        }

        return (
          <label key={field.id} className="grid gap-1 text-sm">
            <span>
              {field.label}
              {field.required ? <span className="text-destructive"> *</span> : null}
            </span>
            {field.helpText ? (
              <span className="text-muted-foreground text-xs">{field.helpText}</span>
            ) : null}
            <input
              id={inputId}
              type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
              disabled={disabled}
              required={field.required}
              placeholder={field.placeholder}
              value={displayValue}
              onChange={(e) => setValue(field.id, e.target.value)}
              className="border-input bg-background h-10 w-full rounded-lg border px-3 text-sm"
            />
          </label>
        );
      })}
    </div>
  );
}
