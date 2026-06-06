"use client";

import type { CustomFormFieldDefinition } from "@/lib/application-form/custom-form";
import { cn } from "@/lib/utils";

export function CustomFormPreview({
  fields,
  className,
}: {
  fields: CustomFormFieldDefinition[];
  className?: string;
}) {
  if (fields.length === 0) {
    return (
      <p className={cn("text-muted-foreground text-sm", className)}>
        항목을 추가하면 체육관 신청 화면과 같은 형태로 미리볼 수 있습니다.
      </p>
    );
  }

  return (
    <div
      className={cn(
        "grid gap-4 rounded-xl border border-dashed bg-muted/20 p-4",
        className,
      )}
    >
      <p className="text-xs font-medium text-muted-foreground">미리보기 (저장 전)</p>
      {fields.map((field) => (
        <PreviewField key={field.id} field={field} />
      ))}
    </div>
  );
}

function PreviewField({ field }: { field: CustomFormFieldDefinition }) {
  const readonly = Boolean(field.readonly || field.source);
  const required = field.required === true;

  return (
    <div className="grid gap-1.5 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">
          {field.label}
          {required ? <span className="text-destructive"> *</span> : null}
        </span>
        {readonly ? (
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
            자동 입력
          </span>
        ) : null}
      </div>
      {field.helpText ? (
        <p className="text-muted-foreground text-xs">{field.helpText}</p>
      ) : null}
      <PreviewControl field={field} readonly={readonly} />
    </div>
  );
}

function PreviewControl({
  field,
  readonly,
}: {
  field: CustomFormFieldDefinition;
  readonly: boolean;
}) {
  const placeholder = field.placeholder ?? "";
  const disabledClass = "opacity-80";

  if (readonly) {
    return (
      <div className="border-input bg-muted/40 rounded-lg border px-3 py-2 text-muted-foreground">
        (제출 시 자동 채움)
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <textarea
        readOnly
        rows={3}
        placeholder={placeholder}
        className={cn(
          "border-input bg-background w-full rounded-lg border px-3 py-2",
          disabledClass,
        )}
      />
    );
  }

  if (field.type === "checkbox") {
    return (
      <label className={cn("flex items-center gap-2", disabledClass)}>
        <input type="checkbox" disabled className="size-4" />
        <span>{field.label}</span>
      </label>
    );
  }

  if (field.type === "select") {
    return (
      <select
        disabled
        className={cn(
          "border-input bg-background h-10 w-full rounded-lg border px-3",
          disabledClass,
        )}
      >
        <option>{placeholder || "선택"}</option>
        {(field.options ?? []).map((opt) => (
          <option key={opt}>{opt}</option>
        ))}
      </select>
    );
  }

  if (field.type === "radio") {
    return (
      <div className={cn("flex flex-wrap gap-3", disabledClass)}>
        {(field.options ?? []).map((opt) => (
          <label key={opt} className="flex items-center gap-2">
            <input type="radio" disabled />
            {opt}
          </label>
        ))}
      </div>
    );
  }

  return (
    <input
      readOnly
      type={
        field.type === "number"
          ? "number"
          : field.type === "date"
            ? "date"
            : "text"
      }
      placeholder={placeholder}
      className={cn(
        "border-input bg-background h-10 w-full rounded-lg border px-3",
        disabledClass,
      )}
    />
  );
}
