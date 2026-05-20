"use client";

import { APPLICATION_FIELD_SOURCE_GROUPS } from "@/lib/pdf-editor/application-field-sources";
import { cn } from "@/lib/utils";

export function FieldSourceSelect({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "border-input bg-background h-9 w-full rounded-md border px-2 text-sm",
      )}
    >
      {APPLICATION_FIELD_SOURCE_GROUPS.map((group) => (
        <optgroup key={group.label} label={group.label}>
          {group.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label} ({opt.value})
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
