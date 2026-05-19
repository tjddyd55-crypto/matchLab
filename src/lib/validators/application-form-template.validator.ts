import { z } from "zod";

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

export const createApplicationFormTemplateSchema = z.object({
  organizerId: z.string().optional(),
  title: z.string().min(1, "템플릿명을 입력해 주세요."),
  description: z.string().optional().nullable(),
  originalPdfPath: z.string().min(1, "PDF 경로를 입력해 주세요."),
  originalPdfFileName: z.string().min(1, "PDF 파일명을 입력해 주세요."),
  fieldsJson: z.array(pdfFieldSchema).default([]),
  repeatGroupsJson: z.array(pdfRepeatGroupSchema).default([]),
  manualFieldsJson: z.unknown().optional().nullable(),
  consentMappingJson: z.unknown().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const updateApplicationFormTemplateSchema = createApplicationFormTemplateSchema
  .partial()
  .extend({ templateId: z.string().min(1) });

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
