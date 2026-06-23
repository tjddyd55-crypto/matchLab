import { z } from "zod";

const legacyScopeValue = z.preprocess(
  (v) => (v === "unassigned" ? "all" : v),
  z.enum(["all", "court"]),
);

export const autoMatchScopeSchema = legacyScopeValue;

export const generateAutoBracketMatchesSchema = z.object({
  eventId: z.string().min(1),
  eligibleOnly: z.boolean().optional().default(false),
  resetExisting: z.boolean().optional().default(false),
  previewOnly: z.boolean().optional().default(false),
  autoMatchScope: autoMatchScopeSchema.optional().default("all"),
  /** court id or "all"(전체 활성 경기장) */
  targetCourtId: z.preprocess(
    (v) => (v === "unassigned" ? "all" : v),
    z.string().optional(),
  ),
  maxMatchesPerCourt: z.coerce.number().int().min(1).optional(),
  forbidSameGym: z.boolean().optional().default(true),
  preserveManualCourts: z.boolean().optional().default(true),
  /** 자동매칭 대진 방식 — 토너먼트 / 원매치 */
  autoBoutFormat: z.enum(["tournament", "one_match"]).optional().default("one_match"),
  defaultRoundCount: z.coerce.number().int().min(1).max(12).optional().default(1),
  defaultRoundTimeSec: z.coerce
    .number()
    .int()
    .min(60)
    .max(300)
    .optional()
    .default(180),
});

export const listUnmatchedBracketCandidatesSchema = z.object({
  eventId: z.string().min(1),
});

export type GenerateAutoBracketMatchesInput = z.infer<
  typeof generateAutoBracketMatchesSchema
>;
