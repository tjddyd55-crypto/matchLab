import { z } from "zod";

const builtInFieldTypeSchema = z.enum([
  "text",
  "textarea",
  "number",
  "date",
  "select",
  "checkbox",
  "radio",
  "file",
  "signature",
  "consentText",
]);

export const builtInFormFieldSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z][a-z0-9_]*$/i, "필드 ID는 영문·숫자·밑줄만 사용합니다."),
  label: z.string().min(1).max(120),
  type: builtInFieldTypeSchema,
  source: z.string().min(1).max(120),
  required: z.union([z.boolean(), z.literal("if_minor")]).optional(),
  editable: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
  placeholder: z.string().max(200).optional().nullable(),
  options: z.array(z.string().max(120)).optional(),
  consentText: z.string().max(4000).optional().nullable(),
});

export const saveBuiltInFormFieldsSchema = z.object({
  eventId: z.string().min(1),
  title: z.string().min(1).max(200).optional(),
  fields: z.array(builtInFormFieldSchema).min(1, "최소 1개 항목이 필요합니다."),
});

export const updateEventApplicationFormModeSchema = z.object({
  eventId: z.string().min(1),
  applicationFormMode: z.enum(["official_pdf", "built_in_form"]),
  applicationFormTemplateId: z.string().min(1).nullable().optional(),
});

export const submitBuiltInFormDocumentSchema = z.object({
  batchId: z.string().min(1),
  fighterId: z.string().min(1),
  divisionId: z.string().min(1),
  manualValues: z.record(z.string(), z.unknown()).default({}),
});

export type BuiltInFormFieldInput = z.infer<typeof builtInFormFieldSchema>;
