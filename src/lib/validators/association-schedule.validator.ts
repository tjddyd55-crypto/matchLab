import { z } from "zod";

export const associationScheduleUpsertSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "제목을 입력해 주세요.")
    .max(200, "제목은 200자 이내로 입력해 주세요."),
  type: z.enum([
    "TOURNAMENT",
    "EDUCATION",
    "MEETING",
    "EVENT",
    "EXAM",
    "OTHER",
  ]),
  startsAtDate: z.string().trim().min(1, "시작일을 입력해 주세요."),
  startsAtHm: z.string().trim().optional().nullable(),
  endsAtDate: z.string().trim().optional().nullable(),
  endsAtHm: z.string().trim().optional().nullable(),
  allDay: z.boolean().optional().default(false),
  location: z.string().trim().max(500).optional().nullable(),
  description: z.string().trim().max(10000).optional().nullable(),
  visibility: z.enum(["PRIVATE", "MEMBER_GYMS"]).optional().default("PRIVATE"),
  relatedUrl: z.string().trim().max(2000).optional().nullable(),
  relatedFormId: z.string().trim().optional().nullable(),
  relatedNoticeId: z.string().trim().optional().nullable(),
});

export type AssociationScheduleUpsertInput = z.infer<
  typeof associationScheduleUpsertSchema
>;
