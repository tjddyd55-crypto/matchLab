import { z } from "zod";

export const gymTogglePublicFighterSchema = z.object({
  fighterId: z.string().min(1),
  isPublic: z.enum(["true", "false"]),
  publicMemo: z.string().max(500).optional(),
});

export const organizerPublicFighterFiltersSchema = z.object({
  q: z.string().max(100).optional(),
  region: z.string().max(80).optional(),
  gymId: z.string().max(50).optional(),
  gender: z.string().max(20).optional(),
  ageGroup: z.string().max(40).optional(),
  weightClass: z.string().max(40).optional(),
  sportType: z.string().max(40).optional(),
  hasRecentEvent: z.enum(["", "yes", "no"]).optional(),
});
