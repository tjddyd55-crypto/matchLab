import { z } from "zod";
import {
  validateCustomFormFieldDefinitions,
  type CustomFormFieldDefinition,
} from "@/lib/application-form/custom-form";

export const pdfFieldSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  page: z.number().int().positive(),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  type: z.enum(["text", "checkbox", "signature", "date"]),
  source: z.string().min(1),
});

export const pdfRepeatGroupSchema = z.object({
  id: z.string().min(1),
  page: z.number().int().positive(),
  startX: z.number(),
  startY: z.number(),
  rowHeight: z.number().positive(),
  maxRows: z.number().int().positive(),
  columns: z.array(
    z.object({
      label: z.string(),
      source: z.string(),
      x: z.number(),
      width: z.number().positive(),
    }),
  ),
});

const customFormFieldSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  type: z.enum([
    "text",
    "textarea",
    "number",
    "date",
    "select",
    "checkbox",
    "radio",
  ]),
  required: z.boolean().optional(),
  readonly: z.boolean().optional(),
  source: z.string().nullable().optional(),
  displayOrder: z.number().optional(),
  options: z.array(z.string()).optional(),
  placeholder: z.string().optional(),
  helpText: z.string().optional(),
});

export const templateFormModeSchema = z.enum(["pdf", "custom", "none"]);

const baseApplicationFormTemplateSchema = z.object({
  organizerId: z.string().optional(),
  title: z.string().min(1, "템플릿명을 입력해 주세요."),
  description: z.string().optional().nullable(),
  templateFormMode: templateFormModeSchema,
  originalPdfPath: z.string().optional().nullable(),
  originalPdfFileName: z.string().optional().nullable(),
  fieldsJson: z.array(pdfFieldSchema).default([]),
  repeatGroupsJson: z.array(pdfRepeatGroupSchema).default([]),
  manualFieldsJson: z.unknown().optional().nullable(),
  consentMappingJson: z.unknown().optional().nullable(),
  isActive: z.boolean().optional(),
});

function parseCustomFieldsFromManualJson(
  raw: unknown,
): CustomFormFieldDefinition[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  const fieldsRaw = (raw as Record<string, unknown>).fields;
  if (!Array.isArray(fieldsRaw)) return [];
  return fieldsRaw
    .map((item) => customFormFieldSchema.safeParse(item))
    .filter((r) => r.success)
    .map((r) => r.data as CustomFormFieldDefinition);
}

export const createApplicationFormTemplateSchema =
  baseApplicationFormTemplateSchema.superRefine((data, ctx) => {
    if (data.templateFormMode === "pdf") {
      if (!data.originalPdfPath?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "PDF 신청서는 PDF 파일 업로드가 필요합니다.",
          path: ["originalPdfPath"],
        });
      }
      if (!data.originalPdfFileName?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "PDF 파일명이 필요합니다.",
          path: ["originalPdfFileName"],
        });
      }
      return;
    }

    if (data.templateFormMode === "custom") {
      const fields = parseCustomFieldsFromManualJson(data.manualFieldsJson);
      const error = validateCustomFormFieldDefinitions(fields);
      if (error) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: error,
          path: ["manualFieldsJson"],
        });
      }
    }
  });

export const updateApplicationFormTemplateSchema =
  baseApplicationFormTemplateSchema
    .partial()
    .extend({
      templateId: z.string().min(1),
      templateFormMode: templateFormModeSchema.optional(),
    })
    .superRefine((data, ctx) => {
      if (!data.templateFormMode) return;
      if (data.templateFormMode === "pdf") {
        if (data.originalPdfPath !== undefined && !data.originalPdfPath?.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "PDF 신청서는 PDF 파일 업로드가 필요합니다.",
            path: ["originalPdfPath"],
          });
        }
        if (
          data.originalPdfFileName !== undefined &&
          !data.originalPdfFileName?.trim()
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "PDF 파일명이 필요합니다.",
            path: ["originalPdfFileName"],
          });
        }
        return;
      }
      if (data.templateFormMode === "custom" && data.manualFieldsJson !== undefined) {
        const fields = parseCustomFieldsFromManualJson(data.manualFieldsJson);
        const error = validateCustomFormFieldDefinitions(fields);
        if (error) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: error,
            path: ["manualFieldsJson"],
          });
        }
      }
    });

export type CreateApplicationFormTemplateInput = z.infer<
  typeof createApplicationFormTemplateSchema
>;
export type UpdateApplicationFormTemplateInput = z.infer<
  typeof updateApplicationFormTemplateSchema
>;

export const linkEventApplicationFormTemplateSchema = z.object({
  eventId: z.string().min(1),
  applicationFormTemplateId: z.string().min(1).nullable(),
});

export type LinkEventApplicationFormTemplateInput = z.infer<
  typeof linkEventApplicationFormTemplateSchema
>;
