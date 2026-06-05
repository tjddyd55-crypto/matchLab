import { z } from "zod";

const mustAgree = z.boolean().refine((v) => v === true, {
  message: "동의가 필요합니다.",
});

export const bulkApplicationItemSchema = z.object({
  fighterId: z.string().min(1),
  divisionId: z.string().min(1),
});

export const bulkApplyToEventSchema = z.object({
  eventId: z.string().min(1),
  applications: z
    .array(bulkApplicationItemSchema)
    .min(1, "신청할 선수를 1명 이상 선택해 주세요.")
    .max(50),
  memo: z.string().max(2000).optional(),
  agreements: z.object({
    rulesAgreed: mustAgree,
    privacyAgreed: mustAgree,
    resultDisclosureAgreed: mustAgree,
    photoVideoAgreed: mustAgree,
    streamingAgreed: z.boolean().optional(),
  }),
});

export type BulkApplyToEventInput = z.infer<typeof bulkApplyToEventSchema>;
