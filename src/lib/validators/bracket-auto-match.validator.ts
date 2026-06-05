import { z } from "zod";

export const generateAutoBracketMatchesSchema = z.object({
  eventId: z.string().min(1),
  eligibleOnly: z.boolean().optional().default(false),
  resetExisting: z.boolean().optional().default(false),
});

export const listUnmatchedBracketCandidatesSchema = z.object({
  eventId: z.string().min(1),
});

export type GenerateAutoBracketMatchesInput = z.infer<
  typeof generateAutoBracketMatchesSchema
>;
