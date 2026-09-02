"use client";

import type { GymMemberDynamicFieldType } from "@/generated/prisma";
import type { GymMemberDynamicFieldDefinition } from "@/lib/gym-member-profile/fields";
import {
  gymProfileFormName,
  sportProfileFormName,
  sportProfileFormNameForTemplate,
} from "@/lib/gym-member-profile/form-names";
import { matchonFieldInputClass, matchonFieldTextareaClass } from "@/lib/ui/matchon-shell-ui";
import { cn } from "@/lib/utils";
import { AppDateInput } from "@/components/shared/AppDateInput";
import { GymMemberFieldLabel } from "@/components/domain/gym-members/GymMemberFormLayout";

function boolToFormValue(value: unknown): string {
  if (value === true) return "true";
  if (value === false) return "false";
  return "";
}

function valueToDefault(
  type: GymMemberDynamicFieldType,
  value: unknown,
): string {
  if (value === null || value === undefined) return "";
  if (type === "boolean") return boolToFormValue(value);
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

export function GymMemberDynamicFieldInput({
  field,
  namePrefix,
  templateId,
  defaultValue,
  className,
}: {
  field: GymMemberDynamicFieldDefinition;
  namePrefix: "sport" | "gym";
  /** Multi-sport: scopes sport field names per template */
  templateId?: string;
  defaultValue?: unknown;
  className?: string;
}) {
  const name =
    namePrefix === "sport"
      ? templateId
        ? sportProfileFormNameForTemplate(templateId, field.stableKey)
        : sportProfileFormName(field.stableKey)
      : gymProfileFormName(field.stableKey);
  const def = valueToDefault(field.type, defaultValue);
  const inputClass = cn(matchonFieldInputClass, "min-h-9 text-sm", className);

  if (field.type === "textarea") {
    return (
      <label className="block space-y-1">
        <GymMemberFieldLabel
          label={field.label}
          required={field.required}
          helpText={field.helpText}
        />
        <textarea
          name={name}
          defaultValue={def}
          rows={4}
          placeholder={field.placeholder}
          className={cn(matchonFieldTextareaClass, "text-sm", className)}
        />
      </label>
    );
  }

  if (field.type === "boolean") {
    return (
      <label className="block space-y-1">
        <GymMemberFieldLabel
          label={field.label}
          required={field.required}
          helpText={field.helpText}
        />
        <select
          name={name}
          defaultValue={def || ""}
          className={inputClass}
          required={field.required}
        >
          <option value="">선택</option>
          <option value="true">예</option>
          <option value="false">아니오</option>
        </select>
      </label>
    );
  }

  if (field.type === "select" || field.type === "radio") {
    return (
      <label className="block space-y-1">
        <GymMemberFieldLabel
          label={field.label}
          required={field.required}
          helpText={field.helpText}
        />
        <select
          name={name}
          defaultValue={def}
          className={inputClass}
          required={field.required}
        >
          <option value="">{field.placeholder || "선택"}</option>
          {(field.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === "date") {
    return (
      <label className="block space-y-1">
        <GymMemberFieldLabel
          label={field.label}
          required={field.required}
          helpText={field.helpText}
        />
        <AppDateInput
          name={name}
          defaultValue={def}
          required={field.required}
        />
      </label>
    );
  }

  return (
    <label className="block space-y-1">
      <GymMemberFieldLabel
        label={field.label}
        required={field.required}
        helpText={field.helpText}
      />
      <input
        name={name}
        type={field.type === "number" ? "number" : "text"}
        defaultValue={def}
        placeholder={field.placeholder}
        className={inputClass}
        required={field.required}
      />
    </label>
  );
}
