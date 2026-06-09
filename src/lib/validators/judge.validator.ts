import { z } from "zod";
import { JudgeDecisionMethod } from "@/lib/enums";

const roundScoreInput = z.object({
  roundNumber: z.number().int().min(1).max(12),
  redScore: z.number().int().min(0).max(10).nullable(),
  blueScore: z.number().int().min(0).max(10).nullable(),
  redKnockdowns: z.number().int().min(0).max(20).default(0),
  blueKnockdowns: z.number().int().min(0).max(20).default(0),
  redDeductions: z.number().int().min(0).max(10).default(0),
  blueDeductions: z.number().int().min(0).max(10).default(0),
  warningMemo: z.string().max(500).nullable().optional(),
  roundMemo: z.string().max(500).nullable().optional(),
});

export const createJudgeCredentialSchema = z.object({
  eventId: z.string().min(1),
  loginId: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9_-]+$/, "영문, 숫자, _, - 만 사용할 수 있습니다."),
  password: z.string().min(4).max(64),
  displayName: z.string().max(80).optional(),
  memo: z.string().max(500).optional(),
});

export const judgeLoginSchema = z.object({
  loginId: z.string().min(1),
  password: z.string().min(1),
});

export const assignJudgeSchema = z.object({
  eventId: z.string().min(1),
  matchId: z.string().min(1),
  credentialId: z.string().min(1),
  judgeOrder: z.number().int().min(1).max(5),
  isHeadJudge: z.boolean().optional(),
});

export const saveJudgeScorecardSchema = z.object({
  matchId: z.string().min(1),
  judgeName: z.string().min(1).max(80),
  decisionMethod: z.nativeEnum(JudgeDecisionMethod).nullable().optional(),
  memo: z.string().max(2000).nullable().optional(),
  submit: z.boolean().default(false),
  rounds: z.array(roundScoreInput).min(1).max(12),
});

export type CreateJudgeCredentialInput = z.infer<
  typeof createJudgeCredentialSchema
>;
export type JudgeLoginInput = z.infer<typeof judgeLoginSchema>;
export type AssignJudgeInput = z.infer<typeof assignJudgeSchema>;
export type SaveJudgeScorecardInput = z.infer<typeof saveJudgeScorecardSchema>;
