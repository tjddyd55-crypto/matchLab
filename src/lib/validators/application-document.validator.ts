import { z } from "zod";

export const createApplicationDocumentSchema = z.object({
  batchId: z.string().min(1),
  fighterId: z.string().min(1),
  divisionId: z.string().min(1),
  manualValues: z.record(z.string(), z.unknown()).optional(),
});

export const updateApplicationDocumentValuesSchema = z.object({
  documentId: z.string().min(1),
  manualValues: z.record(z.string(), z.unknown()),
});

export type CreateApplicationDocumentInput = z.infer<
  typeof createApplicationDocumentSchema
>;
export type UpdateApplicationDocumentValuesInput = z.infer<
  typeof updateApplicationDocumentValuesSchema
>;
