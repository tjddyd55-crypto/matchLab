import { z } from "zod";
import {
  BracketMatchOutcomeStyle,
  CheckInStatus,
  WeighInFailureResolution,
  WeighInStatus,
} from "@/generated/prisma";

export const fieldStatusApplicationIdSchema = z.object({
  applicationId: z.string().min(1, "신청 ID가 필요합니다."),
});

export const setCheckInStatusSchema = fieldStatusApplicationIdSchema.extend({
  status: z.nativeEnum(CheckInStatus),
});

export const setWeighInStatusSchema = fieldStatusApplicationIdSchema.extend({
  status: z.nativeEnum(WeighInStatus),
});

export const recordWeighInWeightSchema = fieldStatusApplicationIdSchema.extend({
  weightKg: z.coerce
    .number()
    .positive("몸무게는 0보다 커야 합니다.")
    .max(500, "몸무게 값이 비정상적으로 큽니다."),
});

export const saveFieldMemoSchema = fieldStatusApplicationIdSchema.extend({
  memo: z.string().max(500).nullable(),
});

export const applyFieldBracketOutcomeSchema = z.object({
  matchId: z.string().min(1, "경기 ID가 필요합니다."),
  loserFighterId: z.string().min(1, "선수 ID가 필요합니다."),
  resultType: z.nativeEnum(BracketMatchOutcomeStyle),
  confirmOfficial: z.boolean().optional().default(true),
  resultMemo: z.string().max(500).nullable().optional(),
});

export const setWeighInFailureResolutionSchema =
  fieldStatusApplicationIdSchema.extend({
    resolution: z.nativeEnum(WeighInFailureResolution),
    handicapNote: z.string().max(500).nullable().optional(),
  });

export const setDisqualificationReasonSchema =
  fieldStatusApplicationIdSchema.extend({
    reason: z.string().min(1, "실격 사유를 입력해 주세요.").max(500),
  });

export const resetFieldStatusInputSchema = fieldStatusApplicationIdSchema;
