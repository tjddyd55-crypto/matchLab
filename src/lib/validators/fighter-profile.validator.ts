import { z } from "zod";

export const fighterProfileUpdateSchema = z.object({
  displayName: z.string().trim().min(1, "표시 이름을 입력해 주세요.").max(80),
  bio: z.string().trim().max(2000).optional().transform((s) => s ?? ""),
  snsInstagram: z.string().trim().max(200).optional().transform((s) => s || undefined),
  snsYoutube: z.string().trim().max(200).optional().transform((s) => s || undefined),
  snsTiktok: z.string().trim().max(200).optional().transform((s) => s || undefined),
  profileImageUrl: z.string().trim().max(2048).optional().transform((s) => s || undefined),
  profileImagePath: z.string().trim().max(512).optional().transform((s) => s || undefined),
  isPublic: z
    .enum(["true", "false"])
    .transform((v) => v === "true"),
  slug: z.string().trim().max(64).optional(),
});

export type FighterProfileUpdateInput = z.infer<typeof fighterProfileUpdateSchema>;
