import { z } from "zod";

/** Gym 선수 기존/외부 전적 — 승/패/무/NC 각각 0 이상 정수 */
const externalRecordCountSchema = z.preprocess((val) => {
  if (val === "" || val === undefined || val === null) return 0;
  const n = typeof val === "number" ? val : Number(val);
  if (!Number.isFinite(n)) return val;
  return Math.trunc(n);
}, z.number().int().min(0).max(9999));

export const fighterExternalRecordUpdateSchema = z
  .object({
    fighterId: z.string().min(1),
    wins: externalRecordCountSchema,
    losses: externalRecordCountSchema,
    draws: externalRecordCountSchema,
    noContests: externalRecordCountSchema,
  })
  .strict();

export type FighterExternalRecordUpdateInput = z.infer<
  typeof fighterExternalRecordUpdateSchema
>;
