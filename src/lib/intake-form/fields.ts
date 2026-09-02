import type { IntakeFormFieldType } from "@/generated/prisma";
import {
  INTAKE_FORM_FIELD_TYPES,
  isIntakeFormOptionFieldType,
} from "@/lib/intake-form/field-types";

export type IntakeFormFieldDefinition = {
  stableKey: string;
  label: string;
  type: IntakeFormFieldType;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  options?: string[];
  displayOrder?: number;
};

const FIELD_KEY_PATTERN = /^[a-z][a-z0-9_]*$/;

const KOREAN_LABEL_KEY_HINTS: ReadonlyArray<[string, string]> = [
  ["연락처", "phone"],
  ["전화번호", "phone"],
  ["휴대폰", "phone"],
  ["이름", "name"],
  ["이메일", "email"],
  ["소속", "affiliation"],
  ["체육관", "gym"],
  ["동의", "consent"],
];

function labelToKeyBase(label: string): string {
  const trimmed = label.trim();
  for (const [hint, id] of KOREAN_LABEL_KEY_HINTS) {
    if (trimmed === hint || trimmed.includes(hint)) return id;
  }
  const ascii = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/^[0-9]+/, "");
  if (ascii && FIELD_KEY_PATTERN.test(ascii)) return ascii;
  if (ascii) {
    const prefixed = `field_${ascii}`.slice(0, 48);
    return FIELD_KEY_PATTERN.test(prefixed) ? prefixed : "field";
  }
  return "field";
}

export function suggestIntakeFormFieldKey(
  label: string,
  existingKeys: Set<string>,
): string {
  const normalized = labelToKeyBase(label);
  let key = normalized;
  let n = 2;
  while (existingKeys.has(key)) {
    key = `${normalized}_${n++}`;
  }
  return key;
}

export function normalizeIntakeFormFields(
  fields: IntakeFormFieldDefinition[],
): IntakeFormFieldDefinition[] {
  return fields.map((field, index) => {
    const type = INTAKE_FORM_FIELD_TYPES.includes(field.type)
      ? field.type
      : "text";
    const options = isIntakeFormOptionFieldType(type)
      ? (field.options ?? []).map((o) => o.trim()).filter(Boolean)
      : undefined;
    return {
      stableKey: field.stableKey.trim(),
      label: field.label.trim(),
      type,
      required: field.required === true,
      placeholder: field.placeholder?.trim() || undefined,
      helpText: field.helpText?.trim() || undefined,
      displayOrder: index + 1,
      options,
    };
  });
}

export function validateIntakeFormFieldDefinitions(
  fields: IntakeFormFieldDefinition[],
): string | null {
  if (fields.length === 0) return null;
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
    if (isIntakeFormOptionFieldType(field.type)) {
      const opts = (field.options ?? []).filter((o) => o.trim());
      if (opts.length === 0) {
        return `"${field.label}" 선택지를 추가해 주세요.`;
      }
      if (opts.some((o) => !o.trim())) {
        return `"${field.label}" 빈 선택지는 사용할 수 없습니다.`;
      }
    }
    if (field.type === "static_info" && field.required) {
      return `"${field.label}" 안내문은 필수로 설정할 수 없습니다.`;
    }
  }
  return null;
}

/** 신청 존재 시 field type 파괴적 변경 금지 */
export function isDestructiveIntakeFieldTypeChange(
  from: IntakeFormFieldType,
  to: IntakeFormFieldType,
): boolean {
  if (from === to) return false;
  const inputTypes: IntakeFormFieldType[] = [
    "text",
    "textarea",
    "number",
    "tel",
    "email",
    "date",
    "radio",
    "select",
    "checkbox_group",
    "consent_checkbox",
  ];
  const fromInput = inputTypes.includes(from);
  const toInput = inputTypes.includes(to);
  if (fromInput && toInput && from !== to) return true;
  if (from === "static_info" && to !== "static_info") return true;
  if (from !== "static_info" && to === "static_info") return true;
  return false;
}

export type IntakeFormAnswerValue = string | string[] | boolean;

export function parseIntakeFormAnswerValue(
  type: IntakeFormFieldType,
  raw: unknown,
): IntakeFormAnswerValue | null {
  if (type === "static_info") return "";
  if (type === "consent_checkbox") {
    if (raw === true || raw === "true" || raw === "on") return true;
    if (raw === false || raw === "false" || raw === "off") return false;
    return null;
  }
  if (type === "checkbox_group") {
    if (Array.isArray(raw)) {
      return raw
        .filter((x): x is string => typeof x === "string")
        .map((x) => x.trim())
        .filter(Boolean);
    }
    if (typeof raw === "string" && raw.trim()) {
      return [raw.trim()];
    }
    return [];
  }
  if (raw == null) return "";
  return String(raw).trim();
}

export function validateIntakeFormAnswers(
  fields: IntakeFormFieldDefinition[],
  answers: Record<string, unknown>,
): string | null {
  for (const field of fields) {
    if (field.type === "static_info") continue;
    const raw = answers[field.stableKey];
    const parsed = parseIntakeFormAnswerValue(field.type, raw);

    if (field.type === "consent_checkbox") {
      if (field.required && parsed !== true) {
        return `"${field.label}" 동의가 필요합니다.`;
      }
      continue;
    }

    if (field.type === "checkbox_group") {
      const values = Array.isArray(parsed) ? parsed : [];
      if (field.required && values.length === 0) {
        return `"${field.label}" 항목은 필수입니다.`;
      }
      const opts = field.options ?? [];
      for (const v of values) {
        if (opts.length && !opts.includes(v)) {
          return `"${field.label}" 선택값이 올바르지 않습니다.`;
        }
      }
      continue;
    }

    const text = typeof parsed === "string" ? parsed : "";
    if (field.required && !text) {
      return `"${field.label}" 항목은 필수입니다.`;
    }
    if (!text) continue;

    if (field.type === "number") {
      const n = Number(text);
      if (!Number.isFinite(n)) {
        return `"${field.label}" 숫자 형식이 올바르지 않습니다.`;
      }
    }
    if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
      return `"${field.label}" 이메일 형식이 올바르지 않습니다.`;
    }
    if (field.type === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      return `"${field.label}" 날짜 형식이 올바르지 않습니다.`;
    }
    if (
      (field.type === "radio" || field.type === "select") &&
      field.options?.length &&
      !field.options.includes(text)
    ) {
      return `"${field.label}" 선택값이 올바르지 않습니다.`;
    }
    if (text.length > 5000) {
      return `"${field.label}" 입력값이 너무 깁니다.`;
    }
  }
  return null;
}

export function formatIntakeAnswerForDisplay(
  type: IntakeFormFieldType,
  valueJson: unknown,
): string {
  if (type === "consent_checkbox") {
    return valueJson === true || valueJson === "true" ? "동의" : "미동의";
  }
  if (type === "checkbox_group") {
    if (Array.isArray(valueJson)) {
      return valueJson.map(String).join(", ");
    }
    return valueJson == null ? "" : String(valueJson);
  }
  if (type === "static_info") return "";
  return valueJson == null ? "" : String(valueJson);
}
