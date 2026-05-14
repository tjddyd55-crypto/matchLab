import { z } from "zod";
import { BracketMatchOutcomeStyle } from "@/lib/enums";

export const confirmMatchResultsSchema = z
  .object({
    matchId: z.string().min(1),
    outcomeMode: z.enum(["win_loss", "draw", "no_contest"]),
    winnerId: z.string().min(1).optional(),
    resultType: z.nativeEnum(BracketMatchOutcomeStyle),
    resultMemo: z.string().max(2000).optional(),
    reason: z.string().max(2000).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.outcomeMode === "win_loss") {
      if (!val.winnerId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "승패 확정에는 승자가 필요합니다.",
          path: ["winnerId"],
        });
      }
      if (
        val.resultType === BracketMatchOutcomeStyle.draw ||
        val.resultType === BracketMatchOutcomeStyle.no_contest
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "승패 확정에서는 무승부·노콘 결방식을 사용할 수 없습니다.",
          path: ["resultType"],
        });
      }
    }
    if (val.outcomeMode === "draw") {
      if (val.resultType !== BracketMatchOutcomeStyle.draw) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "무승부 확정에서는 결방식이 무승부여야 합니다.",
          path: ["resultType"],
        });
      }
    }
    if (val.outcomeMode === "no_contest") {
      if (val.resultType !== BracketMatchOutcomeStyle.no_contest) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "노콘 확정에서는 결방식이 노콘테스트여야 합니다.",
          path: ["resultType"],
        });
      }
    }
  });

export const correctMatchResultSchema = confirmMatchResultsSchema.extend({
  reason: z.string().min(1, "정정 사유는 필수입니다.").max(2000),
});

export const voidMatchResultsSchema = z.object({
  matchId: z.string().min(1),
  reason: z.string().min(1, "무효 사유는 필수입니다.").max(2000),
});

export type ConfirmMatchResultsInput = z.infer<
  typeof confirmMatchResultsSchema
>;
export type CorrectMatchResultInput = z.infer<
  typeof correctMatchResultSchema
>;
export type VoidMatchResultsInput = z.infer<typeof voidMatchResultsSchema>;
