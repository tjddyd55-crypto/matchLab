import { z } from "zod";

export const associationNoticeUpsertSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "제목을 입력해 주세요.")
    .max(200, "제목은 200자 이내로 입력해 주세요."),
  content: z
    .string()
    .trim()
    .min(1, "내용을 입력해 주세요.")
    .max(20000, "내용은 20,000자 이내로 입력해 주세요."),
  isPinned: z.boolean(),
});

export type AssociationNoticeUpsertInput = z.infer<
  typeof associationNoticeUpsertSchema
>;
