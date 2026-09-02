import type { GymMemberDynamicFieldType } from "@/generated/prisma";
import {
  GYM_MEMBER_DYNAMIC_FIELD_TYPES,
  isGymMemberOptionFieldType,
} from "@/lib/gym-member-profile/field-types";

export type GymMemberDynamicFieldDefinition = {
  id?: string;
  stableKey: string;
  label: string;
  type: GymMemberDynamicFieldType;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  options?: string[];
  displayOrder?: number;
  active?: boolean;
};

const FIELD_KEY_PATTERN = /^[a-z][a-z0-9_]*$/;

export function parseGymMemberFieldOptionsJson(
  raw: unknown,
): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const opts = raw
    .map((o) => (typeof o === "string" ? o.trim() : ""))
    .filter(Boolean);
  return opts.length > 0 ? opts : undefined;
}

export function normalizeGymMemberDynamicFields(
  fields: GymMemberDynamicFieldDefinition[],
): GymMemberDynamicFieldDefinition[] {
  return fields.map((field, index) => {
    const type = GYM_MEMBER_DYNAMIC_FIELD_TYPES.includes(field.type)
      ? field.type
      : "text";
    const options = isGymMemberOptionFieldType(type)
      ? (field.options ?? []).map((o) => o.trim()).filter(Boolean)
      : undefined;
    return {
      ...field,
      stableKey: field.stableKey.trim(),
      label: field.label.trim(),
      type,
      required: field.required === true,
      placeholder: field.placeholder?.trim() || undefined,
      helpText: field.helpText?.trim() || undefined,
      displayOrder: index + 1,
      active: field.active !== false,
      options,
    };
  });
}

export function validateGymMemberDynamicFieldDefinitions(
  fields: GymMemberDynamicFieldDefinition[],
): string | null {
  const keys = new Set<string>();
  for (const field of fields) {
    if (!field.stableKey) return "항목 키가 비어 있습니다.";
    if (!FIELD_KEY_PATTERN.test(field.stableKey)) {
      return `"${field.label}" 항목 키 형식이 올바르지 않습니다.`;
    }
    if (keys.has(field.stableKey)) {
      return `항목 키 "${field.stableKey}"가 중복되었습니다.`;
    }
    keys.add(field.stableKey);
    if (!field.label.trim()) return "항목 라벨을 입력해 주세요.";
    if (isGymMemberOptionFieldType(field.type)) {
      const opts = (field.options ?? []).filter((o) => o.trim());
      if (opts.length === 0) {
        return `"${field.label}" 선택지를 추가해 주세요.`;
      }
    }
  }
  return null;
}

export function suggestGymMemberCustomFieldKey(
  label: string,
  existingKeys: Set<string>,
): string {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/^[0-9]+/, "");
  let key = base && FIELD_KEY_PATTERN.test(base) ? base : "field";
  let n = 2;
  while (existingKeys.has(key)) {
    key = `${base || "field"}_${n++}`;
  }
  return key;
}
