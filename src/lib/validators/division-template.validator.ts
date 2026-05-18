import { z } from "zod";

const divisionTemplateItemSchema = z.object({
  sportType: z.string().min(1).max(120),
  ruleType: z.string().max(120).optional().nullable(),
  gender: z.string().max(80).optional().nullable(),
  ageGroup: z.string().max(120).optional().nullable(),
  weightClass: z.string().max(120).optional().nullable(),
  skillLevel: z.string().max(120).optional().nullable(),
});

export type DivisionTemplateItemInput = z.infer<
  typeof divisionTemplateItemSchema
>;

export const divisionTemplateItemsSchema = z
  .array(divisionTemplateItemSchema)
  .min(1, "체급표 항목을 하나 이상 추가해 주세요.");

export const createDivisionTemplateSchema = z.object({
  organizerId: z.string().min(1).optional(),
  title: z.string().min(1).max(200),
  sportType: z.string().max(120).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  items: divisionTemplateItemsSchema,
});

export type CreateDivisionTemplateInput = z.infer<
  typeof createDivisionTemplateSchema
>;

export const updateDivisionTemplateSchema = z.object({
  templateId: z.string().min(1),
  title: z.string().min(1).max(200).optional(),
  sportType: z.string().max(120).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  items: divisionTemplateItemsSchema.optional(),
});

export type UpdateDivisionTemplateInput = z.infer<
  typeof updateDivisionTemplateSchema
>;

export const deleteDivisionTemplateSchema = z.object({
  templateId: z.string().min(1),
});

export const applyDivisionTemplateSchema = z.object({
  eventId: z.string().min(1),
  templateId: z.string().min(1),
});

export type ApplyDivisionTemplateInput = z.infer<
  typeof applyDivisionTemplateSchema
>;
