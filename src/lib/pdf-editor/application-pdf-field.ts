import { pdfFieldSchema } from "@/lib/validators/application-form-template.validator";
import { genFieldIdFromLabel } from "@/lib/pdf-editor/pdf-field-id";

export type ApplicationPdfFieldType = "text" | "checkbox" | "signature" | "date";

export type ApplicationPdfField = {
  id: string;
  label: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: ApplicationPdfFieldType;
  source: string;
};

export const APPLICATION_PDF_FIELD_TYPE_LABELS: Record<
  ApplicationPdfFieldType,
  string
> = {
  text: "텍스트",
  checkbox: "체크박스",
  signature: "서명",
  date: "날짜",
};

export function parseApplicationPdfFields(raw: unknown): ApplicationPdfField[] {
  if (!Array.isArray(raw)) return [];
  const out: ApplicationPdfField[] = [];
  for (const item of raw) {
    const parsed = pdfFieldSchema.safeParse(item);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

export function fieldsToJsonValue(fields: ApplicationPdfField[]): unknown {
  return fields.map((f) => ({
    id: f.id,
    label: f.label,
    page: f.page,
    x: f.x,
    y: f.y,
    width: f.width,
    height: f.height,
    type: f.type,
    source: f.source,
  }));
}

export function createDefaultField(input: {
  type: ApplicationPdfFieldType;
  page: number;
  existingIds: ReadonlySet<string>;
  label?: string;
}): ApplicationPdfField {
  const label =
    input.label?.trim() ||
    APPLICATION_PDF_FIELD_TYPE_LABELS[input.type];
  const id = genFieldIdFromLabel(label, input.existingIds);
  return {
    id,
    label,
    page: input.page,
    x: 40,
    y: 40,
    width: input.type === "signature" ? 120 : 180,
    height: input.type === "signature" ? 40 : 24,
    type: input.type,
    source: defaultSourceForType(input.type),
  };
}

export function defaultSourceForType(type: ApplicationPdfFieldType): string {
  switch (type) {
    case "signature":
      return "athlete.signatureImage";
    case "checkbox":
      return "manual";
    case "date":
      return "athlete.signedAt";
    default:
      return "fighter.name";
  }
}

export function duplicateField(
  field: ApplicationPdfField,
  existingIds: ReadonlySet<string>,
): ApplicationPdfField {
  const label = `${field.label} 복사`;
  const id = genFieldIdFromLabel(label, existingIds);
  return {
    ...field,
    id,
    label,
    x: field.x + 12,
    y: field.y + 12,
  };
}
