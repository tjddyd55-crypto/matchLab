import { z } from "zod";
import { validateSnsUrl } from "@/lib/validators/sns-url";

function snsField(platform: "instagram" | "youtube" | "tiktok") {
  return z
    .string()
    .trim()
    .optional()
    .transform((s) => s ?? "")
    .superRefine((val, ctx) => {
      const result = validateSnsUrl(val, platform);
      if (!result.ok) {
        ctx.addIssue({ code: "custom", message: result.message });
      }
    })
    .transform((val) => {
      const result = validateSnsUrl(val, platform);
      return result.ok ? result.value : undefined;
    });
}

export const fighterProfileUpdateSchema = z.object({
  displayName: z.string().trim().min(1, "표시 이름을 입력해 주세요.").max(80),
  bio: z.string().trim().max(2000).optional().transform((s) => s ?? ""),
  snsInstagram: snsField("instagram"),
  snsYoutube: snsField("youtube"),
  snsTiktok: snsField("tiktok"),
  profileImageUrl: z
    .string()
    .trim()
    .max(2048)
    .transform((s) => (s === "" ? null : s || null)),
  profileImagePath: z
    .string()
    .trim()
    .max(512)
    .transform((s) => (s === "" ? null : s || null)),
  isPublic: z
    .enum(["true", "false"])
    .transform((v) => v === "true"),
  slug: z.string().trim().max(64).optional(),
});

export type FighterProfileUpdateInput = z.infer<typeof fighterProfileUpdateSchema>;
