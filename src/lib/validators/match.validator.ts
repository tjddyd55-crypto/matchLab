import { z } from "zod";
import {
  BracketMatchOutcomeStyle,
  BracketMatchStatus,
} from "@/lib/enums";

export const updateMatchStatusSchema = z.object({
  matchId: z.string().min(1),
  status: z.nativeEnum(BracketMatchStatus),
  reason: z.string().max(2000).optional(),
});

export const recordMatchOutcomeDraftSchema = z
  .object({
    matchId: z.string().min(1),
    outcomeMode: z.enum(["win_loss", "draw", "no_contest"]),
    winnerId: z.string().min(1).optional(),
    loserId: z.string().min(1).optional(),
    resultType: z.nativeEnum(BracketMatchOutcomeStyle),
    resultMemo: z.string().max(2000).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.outcomeMode === "win_loss") {
      if (!val.winnerId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "승패 모드에서는 승자 선수를 선택해야 합니다.",
          path: ["winnerId"],
        });
      }
      if (
        val.resultType === BracketMatchOutcomeStyle.draw ||
        val.resultType === BracketMatchOutcomeStyle.no_contest
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "승패 모드에서는 결방식으로 무승부·노콘을 선택할 수 없습니다.",
          path: ["resultType"],
        });
      }
    }
    if (val.outcomeMode === "draw") {
      if (val.resultType !== BracketMatchOutcomeStyle.draw) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "무승부 모드에서는 결방식이 무승부여야 합니다.",
          path: ["resultType"],
        });
      }
    }
    if (val.outcomeMode === "no_contest") {
      if (val.resultType !== BracketMatchOutcomeStyle.no_contest) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "노콘 모드에서는 결방식이 노콘테스트여야 합니다.",
          path: ["resultType"],
        });
      }
    }
  });

export const cancelMatchSchema = z.object({
  matchId: z.string().min(1),
  reason: z.string().max(2000).optional(),
});

export type UpdateMatchStatusInput = z.infer<typeof updateMatchStatusSchema>;
export type RecordMatchOutcomeDraftInput = z.infer<
  typeof recordMatchOutcomeDraftSchema
>;
export type CancelMatchInput = z.infer<typeof cancelMatchSchema>;
