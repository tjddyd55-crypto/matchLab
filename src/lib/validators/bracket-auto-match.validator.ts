import { z } from "zod";

export const autoMatchScopeSchema = z.enum(["all", "court"]);

export const generateAutoBracketMatchesSchema = z.object({
  eventId: z.string().min(1),
  eligibleOnly: z.boolean().optional().default(false),
  resetExisting: z.boolean().optional().default(false),
  previewOnly: z.boolean().optional().default(false),
  autoMatchScope: autoMatchScopeSchema.optional().default("all"),
  /** court id or "all"(전체 활성 경기장) */
  targetCourtId: z.string().optional(),
  maxMatchesPerCourt: z.coerce.number().int().min(1).optional(),
  forbidSameGym: z.boolean().optional().default(true),
  preserveManualCourts: z.boolean().optional().default(true),
});

export const listUnmatchedBracketCandidatesSchema = z.object({
  eventId: z.string().min(1),
});

export type GenerateAutoBracketMatchesInput = z.infer<
  typeof generateAutoBracketMatchesSchema
>;
