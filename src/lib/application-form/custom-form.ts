import type { Prisma } from "@/generated/prisma";
import { CUSTOM_FORM_SOURCE_VALUES } from "@/lib/application-form/custom-form-sources";
import { publicAgeGroupFromBirthDate } from "@/lib/public-fighter/age-group";

export type ApplicationFormMode = "none" | "pdf" | "custom";

export type CustomFormFieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "select"
  | "checkbox"
  | "radio";

export type CustomFormFieldDefinition = {
  id: string;
  label: string;
  type: CustomFormFieldType;
  required?: boolean;
  source?: string | null;
  readonly?: boolean;
  displayOrder?: number;
  options?: string[];
  placeholder?: string;
  helpText?: string;
};

export type ManualFieldsConfig = {
  formMode: ApplicationFormMode;
  fields: CustomFormFieldDefinition[];
};

export type CustomFormAnswerRow = {
  id: string;
  label: string;
  type: CustomFormFieldType;
  value: string;
  readonly: boolean;
};

export type CustomFormSnapshot = {
  templateId: string;
  templateTitle: string;
  capturedAt: string;
  answers: CustomFormAnswerRow[];
};

export type CustomFormSourceContext = {
  eventTitle: string;
  gymName: string;
  divisionLabel: string;
  division: {
    sportType: string | null;
    gender: string | null;
    ageGroup: string | null;
    weightClass: string | null;
  };
  fighter: {
    name: string;
    gender: string;
    birthDate: Date;
    weightKg: number | null;
    primarySport: string | null;
    guardianName: string | null;
    guardianPhone: string | null;
  };
};

const FIELD_TYPES: CustomFormFieldType[] = [
  "text",
  "textarea",
  "number",
  "date",
  "select",
  "checkbox",
  "radio",
];

function parseField(raw: unknown): CustomFormFieldDefinition | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id.trim() : "";
  const label = typeof o.label === "string" ? o.label.trim() : "";
  const type = typeof o.type === "string" ? o.type : "text";
  if (!id || !label || !FIELD_TYPES.includes(type as CustomFormFieldType)) {
    return null;
  }
  const options = Array.isArray(o.options)
    ? o.options.filter((x): x is string => typeof x === "string")
    : undefined;
  const source =
    typeof o.source === "string" && o.source.trim() ? o.source.trim() : null;
  return {
    id,
    label,
    type: type as CustomFormFieldType,
    required: o.required === true,
    source,
    readonly: o.readonly === true,
    displayOrder:
      typeof o.displayOrder === "number" ? o.displayOrder : undefined,
    options,
    placeholder:
      typeof o.placeholder === "string" ? o.placeholder.trim() || undefined : undefined,
    helpText:
      typeof o.helpText === "string" ? o.helpText.trim() || undefined : undefined,
  };
}

export function parseManualFieldsConfig(
  raw: unknown,
): {
  formMode?: ApplicationFormMode;
  fields: CustomFormFieldDefinition[];
} {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { fields: [] };
  }
  const o = raw as Record<string, unknown>;
  const formMode =
    o.formMode === "custom" || o.formMode === "pdf" ? o.formMode : undefined;
  const fieldsRaw = Array.isArray(o.fields) ? o.fields : [];
  const fields = fieldsRaw
    .map(parseField)
    .filter((f): f is CustomFormFieldDefinition => f != null)
    .sort(
      (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.id.localeCompare(b.id),
    );
  return { formMode, fields };
}

export function resolveApplicationFormMode(input: {
  templateId: string | null;
  fieldsJson: Prisma.JsonValue;
  manualFieldsJson: Prisma.JsonValue | null;
} | null): ApplicationFormMode {
  if (!input?.templateId) return "none";
  const manual = parseManualFieldsConfig(input.manualFieldsJson);
  if (manual.formMode === "custom" && manual.fields.length > 0) {
    return "custom";
  }
  if (Array.isArray(input.fieldsJson) && input.fieldsJson.length > 0) {
    return "pdf";
  }
  if (manual.fields.length > 0) return "custom";
  return "none";
}

function resolveSourceValue(
  source: string,
  ctx: CustomFormSourceContext,
): string {
  const parts = source.split(".");
  if (parts.length < 2) return "";
  const [root, key] = parts;
  switch (root) {
    case "fighter":
      if (key === "name") return ctx.fighter.name;
      if (key === "gender") return ctx.fighter.gender;
      if (key === "birthDate") {
        return ctx.fighter.birthDate.toISOString().slice(0, 10);
      }
      if (key === "ageGroup") {
        return publicAgeGroupFromBirthDate(ctx.fighter.birthDate);
      }
      if (key === "weightKg") {
        return ctx.fighter.weightKg == null ? "" : String(ctx.fighter.weightKg);
      }
      if (key === "primarySport") return ctx.fighter.primarySport ?? "";
      break;
    case "gym":
      if (key === "name") return ctx.gymName;
      break;
    case "event":
      if (key === "title") return ctx.eventTitle;
      break;
    case "division":
      if (key === "weightClass") {
        return ctx.division.weightClass ?? ctx.divisionLabel;
      }
      if (key === "sportType") return ctx.division.sportType ?? "";
      if (key === "gender") return ctx.division.gender ?? "";
      if (key === "ageGroup") return ctx.division.ageGroup ?? "";
      break;
    case "guardian":
      if (key === "name") return ctx.fighter.guardianName ?? "";
      if (key === "phone") return ctx.fighter.guardianPhone ?? "";
      break;
    default:
      break;
  }
  return "";
}

export function buildCustomFormAnswerRows(
  fields: CustomFormFieldDefinition[],
  answers: Record<string, unknown>,
  ctx: CustomFormSourceContext,
): CustomFormAnswerRow[] {
  return fields.map((field) => {
    let value = "";
    if (field.source) {
      value = resolveSourceValue(field.source, ctx);
    } else {
      const raw = answers[field.id];
      if (field.type === "checkbox") {
        value = raw === true || raw === "true" || raw === "on" ? "예" : "아니오";
      } else if (raw != null) {
        value = String(raw).trim();
      }
    }
    return {
      id: field.id,
      label: field.label,
      type: field.type,
      value,
      readonly: Boolean(field.readonly || field.source),
    };
  });
}

export function validateCustomFormAnswers(
  fields: CustomFormFieldDefinition[],
  answers: Record<string, unknown> | undefined,
): string | null {
  if (fields.length === 0) return null;
  const map = answers ?? {};
  for (const field of fields) {
    if (field.source || field.readonly) continue;
    const raw = map[field.id];
    if (field.type === "checkbox") {
      if (field.required && raw !== true && raw !== "true" && raw !== "on") {
        return `"${field.label}" 항목은 필수입니다.`;
      }
      continue;
    }
    const text = raw == null ? "" : String(raw).trim();
    if (field.required && !text) {
      return `"${field.label}" 항목은 필수입니다.`;
    }
    if (
      field.type === "select" ||
      field.type === "radio"
    ) {
      if (text && field.options?.length && !field.options.includes(text)) {
        return `"${field.label}" 선택값이 올바르지 않습니다.`;
      }
    }
  }
  return null;
}

export function buildCustomFormSnapshot(
  fields: CustomFormFieldDefinition[],
  answers: Record<string, unknown>,
  ctx: CustomFormSourceContext,
  meta: { templateId: string; templateTitle: string; capturedAt: string },
): CustomFormSnapshot {
  return {
    templateId: meta.templateId,
    templateTitle: meta.templateTitle,
    capturedAt: meta.capturedAt,
    answers: buildCustomFormAnswerRows(fields, answers, ctx),
  };
}

const FIELD_ID_PATTERN = /^[a-z][a-z0-9_]*$/;

export function suggestFieldId(label: string, existingIds: Set<string>): string {
  const base =
    label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .replace(/^[0-9]+/, "") || "field";
  const normalized = FIELD_ID_PATTERN.test(base) ? base : `field_${base}`;
  let id = normalized;
  let n = 1;
  while (existingIds.has(id)) {
    id = `${normalized}_${n++}`;
  }
  return id;
}

export function normalizeCustomFormFields(
  fields: CustomFormFieldDefinition[],
): CustomFormFieldDefinition[] {
  return fields.map((field, index) => ({
    ...field,
    id: field.id.trim(),
    label: field.label.trim(),
    displayOrder: index + 1,
    source: field.source?.trim() || null,
    readonly: field.readonly === true,
    options:
      field.type === "select" || field.type === "radio" || field.type === "checkbox"
        ? (field.options ?? []).map((o) => o.trim()).filter(Boolean)
        : undefined,
  }));
}

export function serializeManualFieldsConfig(
  config: ManualFieldsConfig,
): Record<string, unknown> {
  const fields = normalizeCustomFormFields(config.fields).map((field) => {
    const row: Record<string, unknown> = {
      id: field.id,
      label: field.label,
      type: field.type,
      required: field.required === true,
      readonly: field.readonly === true,
      source: field.source ?? null,
      displayOrder: field.displayOrder,
    };
    if (field.placeholder) row.placeholder = field.placeholder;
    if (field.helpText) row.helpText = field.helpText;
    if (field.options?.length) row.options = field.options;
    return row;
  });
  return { formMode: config.formMode, fields };
}

export function validateCustomFormFieldDefinitions(
  fields: CustomFormFieldDefinition[],
): string | null {
  if (fields.length === 0) {
    return "자체 폼 항목을 1개 이상 추가해 주세요.";
  }
  const ids = new Set<string>();
  for (const field of fields) {
    if (!field.label.trim()) {
      return "모든 항목에 라벨을 입력해 주세요.";
    }
    const id = field.id.trim();
    if (!id || !FIELD_ID_PATTERN.test(id)) {
      return `"${field.label}" 항목 ID는 영문 소문자·숫자·밑줄(_)만 사용할 수 있습니다.`;
    }
    if (ids.has(id)) {
      return `항목 ID "${id}"가 중복되었습니다.`;
    }
    ids.add(id);
    if (field.source && !CUSTOM_FORM_SOURCE_VALUES.has(field.source)) {
      return `"${field.label}" 자동 입력 source가 올바르지 않습니다.`;
    }
    if (
      field.type === "select" ||
      field.type === "radio" ||
      (field.type === "checkbox" && (field.options?.length ?? 0) > 0)
    ) {
      const opts = (field.options ?? []).map((o) => o.trim()).filter(Boolean);
      if (opts.length === 0) {
        return `"${field.label}" 항목에 옵션을 1개 이상 추가해 주세요.`;
      }
    }
  }
  return null;
}

export function inferTemplateEditorFormMode(input: {
  fieldsJson: unknown;
  manualFieldsJson: unknown | null;
  originalPdfPath: string | null;
}): ApplicationFormMode {
  const manual = parseManualFieldsConfig(input.manualFieldsJson);
  if (manual.formMode === "custom" && manual.fields.length > 0) {
    return "custom";
  }
  if (Array.isArray(input.fieldsJson) && input.fieldsJson.length > 0) {
    return "pdf";
  }
  if (input.originalPdfPath) return "pdf";
  if (manual.fields.length > 0) return "custom";
  return "none";
}

export function readCustomFormFromAgreementSnapshot(
  snapshot: unknown,
): CustomFormSnapshot | null {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return null;
  }
  const customForm = (snapshot as Record<string, unknown>).customForm;
  if (!customForm || typeof customForm !== "object" || Array.isArray(customForm)) {
    return null;
  }
  const o = customForm as Record<string, unknown>;
  if (typeof o.templateId !== "string" || !Array.isArray(o.answers)) {
    return null;
  }
  const answers: CustomFormAnswerRow[] = [];
  for (const item of o.answers) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (typeof row.id !== "string" || typeof row.label !== "string") continue;
    answers.push({
      id: row.id,
      label: row.label,
      type:
        typeof row.type === "string" &&
        FIELD_TYPES.includes(row.type as CustomFormFieldType)
          ? (row.type as CustomFormFieldType)
          : "text",
      value: typeof row.value === "string" ? row.value : "",
      readonly: row.readonly === true,
    });
  }
  return {
    templateId: o.templateId,
    templateTitle:
      typeof o.templateTitle === "string" ? o.templateTitle : "자체 신청서",
    capturedAt: typeof o.capturedAt === "string" ? o.capturedAt : "",
    answers,
  };
}
