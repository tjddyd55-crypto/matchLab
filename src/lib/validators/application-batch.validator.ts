import { z } from "zod";

export const submitApplicationBatchSchema = z.object({
  batchId: z.string().min(1),
});

export const createApplicationBatchSchema = z.object({
  eventId: z.string().min(1),
});

export type SubmitApplicationBatchInput = z.infer<
  typeof submitApplicationBatchSchema
>;
export type CreateApplicationBatchInput = z.infer<
  typeof createApplicationBatchSchema
>;
