"use client";

import type { IntakeFormFieldType } from "@/generated/prisma";
import {
  matchonFieldInputClass,
  matchonFieldSelectClass,
} from "@/lib/ui/matchon-shell-ui";
import { cn } from "@/lib/utils";

export type IntakeFormFieldView = {
  stableKey: string;
  label: string;
  type: IntakeFormFieldType;
  required: boolean;
  placeholder?: string | null;
  helpText?: string | null;
  options?: string[];
};

export function IntakeFormFieldRenderer({
  field,
  value,
  onChange,
  disabled,
  namePrefix = "",
}: {
  field: IntakeFormFieldView;
  value: unknown;
  onChange?: (stableKey: string, value: unknown) => void;
  disabled?: boolean;
  namePrefix?: string;
}) {
  const inputId = `${namePrefix}${field.stableKey}`;
  const setValue = (v: unknown) => onChange?.(field.stableKey, v);

  if (field.type === "static_info") {
    return (
      <div className="rounded-lg border border-matchon-border bg-matchon-surface/60 px-3 py-2 text-sm text-matchon-text-secondary">
        {field.helpText || field.label}
      </div>
    );
  }

  const label = (
    <span className="text-sm font-semibold text-matchon-text-primary">
      {field.label}
      {field.required ? <span className="text-destructive"> *</span> : null}
    </span>
  );

  if (field.type === "textarea") {
    return (
      <label className="grid gap-1.5" htmlFor={inputId}>
        {label}
        {field.helpText ? (
          <span className="text-xs text-matchon-text-secondary">{field.helpText}</span>
        ) : null}
        <textarea
          id={inputId}
          disabled={disabled}
          value={value == null ? "" : String(value)}
          onChange={(e) => setValue(e.target.value)}
          placeholder={field.placeholder ?? undefined}
          className={cn(matchonFieldInputClass, "min-h-[96px]")}
        />
      </label>
    );
  }

  if (field.type === "radio") {
    return (
      <fieldset className="grid gap-2">
        <legend>{label}</legend>
        {field.helpText ? (
          <span className="text-xs text-matchon-text-secondary">{field.helpText}</span>
        ) : null}
        <div className="flex flex-col gap-2">
          {(field.options ?? []).map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={inputId}
                disabled={disabled}
                checked={value === opt}
                onChange={() => setValue(opt)}
              />
              {opt}
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  if (field.type === "select") {
    return (
      <label className="grid gap-1.5" htmlFor={inputId}>
        {label}
        {field.helpText ? (
          <span className="text-xs text-matchon-text-secondary">{field.helpText}</span>
        ) : null}
        <select
          id={inputId}
          disabled={disabled}
          value={value == null ? "" : String(value)}
          onChange={(e) => setValue(e.target.value)}
          className={matchonFieldSelectClass}
        >
          <option value="">선택</option>
          {(field.options ?? []).map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === "checkbox_group") {
    const selected = Array.isArray(value)
      ? value.map(String)
      : value
        ? [String(value)]
        : [];
    return (
      <fieldset className="grid gap-2">
        <legend>{label}</legend>
        {field.helpText ? (
          <span className="text-xs text-matchon-text-secondary">{field.helpText}</span>
        ) : null}
        <div className="flex flex-col gap-2">
          {(field.options ?? []).map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                disabled={disabled}
                checked={selected.includes(opt)}
                onChange={(e) => {
                  const next = e.target.checked
                    ? [...selected, opt]
                    : selected.filter((x) => x !== opt);
                  setValue(next);
                }}
              />
              {opt}
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  if (field.type === "consent_checkbox") {
    const checked =
      value === true || value === "true" || value === "on";
    return (
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          id={inputId}
          disabled={disabled}
          checked={checked}
          onChange={(e) => setValue(e.target.checked)}
          className="mt-1 size-4"
        />
        <span>
          <span className="font-semibold text-matchon-text-primary">
            {field.label}
            {field.required ? <span className="text-destructive"> *</span> : null}
          </span>
          {field.helpText ? (
            <span className="mt-1 block text-xs text-matchon-text-secondary">
              {field.helpText}
            </span>
          ) : null}
        </span>
      </label>
    );
  }

  const inputType =
    field.type === "number"
      ? "number"
      : field.type === "tel"
        ? "tel"
        : field.type === "email"
          ? "email"
          : field.type === "date"
            ? "date"
            : "text";

  return (
    <label className="grid gap-1.5" htmlFor={inputId}>
      {label}
      {field.helpText ? (
        <span className="text-xs text-matchon-text-secondary">{field.helpText}</span>
      ) : null}
      <input
        id={inputId}
        type={inputType}
        disabled={disabled}
        value={value == null ? "" : String(value)}
        onChange={(e) => setValue(e.target.value)}
        placeholder={field.placeholder ?? undefined}
        className={matchonFieldInputClass}
      />
    </label>
  );
}
