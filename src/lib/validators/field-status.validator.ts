import { z } from "zod";
import { CheckInStatus, WeighInStatus } from "@/generated/prisma";

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
  memo: z.string().max(2000).nullable(),
});
