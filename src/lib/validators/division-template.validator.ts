import { z } from "zod";

export const divisionTemplateItemSchema = z.object({
  sportType: z.string().max(120).optional().nullable(),
  ruleType: z.string().max(120).optional().nullable(),
  gender: z.string().max(80).optional().nullable(),
  ageGroup: z.string().max(120).optional().nullable(),
  weightClass: z.string().max(120).optional().nullable(),
  weightClassName: z.string().max(120).optional().nullable(),
  weightLimitText: z.string().max(40).optional().nullable(),
  weightLimitKg: z.number().optional().nullable(),
  limitType: z.enum(["under", "over", "range"]).optional().nullable(),
  displayOrder: z.number().int().optional().nullable(),
  isActive: z.boolean().optional(),
  skillLevel: z.string().max(120).optional().nullable(),
});

export type DivisionTemplateItemInput = z.infer<
  typeof divisionTemplateItemSchema
>;

export const divisionTemplateItemsSchema = z
  .array(divisionTemplateItemSchema)
  .min(1, "체급표 항목을 하나 이상 추가해 주세요.")
  .superRefine((items, ctx) => {
    const active = items.filter((i) => i.isActive !== false);
    if (active.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "활성 체급 항목을 하나 이상 추가해 주세요.",
      });
    }
  });

export const createDivisionTemplateSchema = z.object({
  organizerId: z.string().min(1).optional(),
  title: z.string().min(1).max(200),
  sportType: z.string().max(120).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  isActive: z.boolean().optional(),
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
  isActive: z.boolean().optional(),
  items: divisionTemplateItemsSchema.optional(),
});

export type UpdateDivisionTemplateInput = z.infer<
  typeof updateDivisionTemplateSchema
>;

export const deleteDivisionTemplateSchema = z.object({
  templateId: z.string().min(1),
});

export const applyDivisionTemplateModeSchema = z.enum([
  "append_skip",
  "append_all",
  "replace",
]);

export type ApplyDivisionTemplateMode = z.infer<
  typeof applyDivisionTemplateModeSchema
>;

export const applyDivisionTemplateSchema = z.object({
  eventId: z.string().min(1),
  templateId: z.string().min(1),
  mode: applyDivisionTemplateModeSchema.default("append_skip"),
});

export type ApplyDivisionTemplateInput = z.infer<
  typeof applyDivisionTemplateSchema
>;
