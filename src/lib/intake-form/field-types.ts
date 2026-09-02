import type { IntakeFormFieldType } from "@/generated/prisma";

export type { IntakeFormFieldType };

export const INTAKE_FORM_FIELD_TYPES: IntakeFormFieldType[] = [
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
  "static_info",
];

export const INTAKE_FORM_OPTION_FIELD_TYPES: IntakeFormFieldType[] = [
  "radio",
  "select",
  "checkbox_group",
];

export const INTAKE_FORM_INPUT_FIELD_TYPES: IntakeFormFieldType[] = [
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

export function isIntakeFormOptionFieldType(
  type: IntakeFormFieldType,
): boolean {
  return INTAKE_FORM_OPTION_FIELD_TYPES.includes(type);
}

export function isIntakeFormInputFieldType(type: IntakeFormFieldType): boolean {
  return INTAKE_FORM_INPUT_FIELD_TYPES.includes(type);
}
