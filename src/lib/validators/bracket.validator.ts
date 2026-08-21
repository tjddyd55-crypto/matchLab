import { BracketType } from "@/generated/prisma";
import { z } from "zod";

export const createBracketSchema = z.object({
  eventId: z.string().min(1),
  divisionId: z.string().min(1, "경기구분을 선택해 주세요."),
  type: z.nativeEnum(BracketType),
});

export const publishBracketSchema = z.object({
  bracketId: z.string().min(1),
});

export const unpublishBracketSchema = publishBracketSchema;

export const eventBracketPublicationSchema = z.object({
  eventId: z.string().min(1),
});

export const setPublicUnmatchedListSchema = z.object({
  eventId: z.string().min(1),
  enabled: z.boolean(),
});

const optionalFighterId = z
  .string()
  .optional()
  .transform((s) => (s && s.trim() !== "" ? s.trim() : undefined));

const optionalPositiveInt = z
  .union([z.number(), z.string(), z.undefined(), z.null()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === null || v === "") return undefined;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : Number.NaN;
  })
  .refine((n) => n === undefined || (Number.isInteger(n) && n > 0), {
    message: "양의 정수여야 합니다.",
  });

const matchListRowSchema = z
  .object({
    fighterRedId: optionalFighterId,
    fighterBlueId: optionalFighterId,
    matchOrder: z.number().int().nonnegative(),
    globalMatchOrder: z
      .number()
      .int()
      .nonnegative()
      .optional(),
    matchNumber: optionalPositiveInt,
    matNumber: optionalPositiveInt,
  })
  .refine((r) => Boolean(r.fighterRedId || r.fighterBlueId), {
    message: "레드 또는 블루 선수를 하나 이상 지정해 주세요.",
  });

export const createMatchListMatchesSchema = z.object({
  bracketId: z.string().min(1),
  defaultCourtId: z.string().min(1, "경기장을 선택해 주세요."),
  matches: z.array(matchListRowSchema),
});

export const createSingleEliminationDraftSchema = z.object({
  bracketId: z.string().min(1),
  courtId: z.string().min(1, "경기장을 선택해 주세요."),
  slotCount: z.union([
    z.literal(4),
    z.literal(8),
    z.literal(16),
  ]),
});

export const assignFighterToMatchSchema = z.object({
  bracketId: z.string().min(1),
  matchId: z.string().min(1),
  fighterId: z.string().min(1),
  slot: z.enum(["red", "blue"]),
  reason: z.string().max(500).optional(),
  moveFromOtherMatch: z.boolean().optional().default(false),
});

export const addEmptyBracketMatchSchema = z.object({
  bracketId: z.string().min(1),
  defaultCourtId: z.string().min(1).optional(),
});

/** Drag&Drop / tap 수동 경기 생성 — 미배정 2명으로 Match 1개 */
export const createManualMatchWithPairSchema = z.object({
  bracketId: z.string().min(1),
  redFighterId: z.string().min(1),
  blueFighterId: z.string().min(1),
  defaultCourtId: z.string().min(1).optional(),
});

export const ensureBracketForDivisionSchema = z.object({
  eventId: z.string().min(1),
  divisionId: z.string().min(1),
});

export const deleteBracketMatchSchema = z.object({
  bracketId: z.string().min(1),
  matchId: z.string().min(1),
});

export const resetEventBracketsSchema = z.object({
  eventId: z.string().min(1),
});

export const updateMatchOrderAndMatSchema = z
  .object({
    matchId: z.string().min(1),
    matchOrder: z.number().int().nonnegative().optional(),
    globalMatchOrder: z.number().int().nonnegative().optional(),
    matNumber: z.number().int().positive().optional(),
    reason: z.string().max(500).optional(),
  })
  .refine(
    (d) =>
      d.matchOrder !== undefined ||
      d.globalMatchOrder !== undefined ||
      d.matNumber !== undefined,
    { message: "변경할 순서 또는 매트 번호가 필요합니다." },
  );

export const removeFighterFromMatchSchema = z.object({
  bracketId: z.string().min(1),
  matchId: z.string().min(1),
  slot: z.enum(["red", "blue"]),
  reason: z.string().max(500).optional(),
});

export const reorderBracketMatchSchema = z.object({
  matchId: z.string().min(1),
  direction: z.enum(["up", "down"]),
});

export const resetBracketSchema = z.object({
  bracketId: z.string().min(1),
  reason: z.string().max(500).optional(),
});

export type CreateBracketInput = z.infer<typeof createBracketSchema>;
export type CreateMatchListMatchesInput = z.infer<
  typeof createMatchListMatchesSchema
>;
export type CreateSingleEliminationDraftInput = z.infer<
  typeof createSingleEliminationDraftSchema
>;
export type AssignFighterToMatchInput = z.infer<
  typeof assignFighterToMatchSchema
>;
export type UpdateMatchOrderAndMatInput = z.infer<
  typeof updateMatchOrderAndMatSchema
>;
export type RemoveFighterFromMatchInput = z.infer<
  typeof removeFighterFromMatchSchema
>;
export type ResetBracketInput = z.infer<typeof resetBracketSchema>;
export type EnsureBracketForDivisionInput = z.infer<
  typeof ensureBracketForDivisionSchema
>;
export type DeleteBracketMatchInput = z.infer<typeof deleteBracketMatchSchema>;
export type CreateManualMatchWithPairInput = z.infer<
  typeof createManualMatchWithPairSchema
>;
