import { z } from "zod";
import { EventStatus } from "@/generated/prisma";

const cuid = z.string().min(20).max(32);

const dateIn = z.coerce.date();

const trimmedNullable = z
  .string()
  .max(500)
  .optional()
  .nullable()
  .transform((s) => {
    if (s === undefined || s === null) return null;
    const t = s.trim();
    return t === "" ? null : t;
  });

const locationNameField = z
  .string()
  .max(200)
  .optional()
  .nullable()
  .transform((s) => {
    if (s === undefined || s === null) return null;
    const t = s.trim();
    return t === "" ? null : t;
  });

const detailAddressField = z
  .string()
  .max(300)
  .optional()
  .nullable()
  .transform((s) => {
    if (s === undefined || s === null) return null;
    const t = s.trim();
    return t === "" ? null : t;
  });

const postalCodeField = z
  .string()
  .max(10)
  .optional()
  .nullable()
  .transform((s) => {
    if (s === undefined || s === null) return null;
    const t = s.trim();
    return t === "" ? null : t;
  });

export const createEventSchema = z
  .object({
    organizerId: cuid.optional(),
    title: z.string().min(1).max(200),
    description: z.string().max(8000).optional().nullable(),
    location: trimmedNullable,
    roadAddress: trimmedNullable,
    jibunAddress: trimmedNullable,
    detailAddress: detailAddressField,
    postalCode: postalCodeField,
    locationName: locationNameField,
    eventDate: dateIn,
    registrationStartDate: dateIn,
    registrationEndDate: dateIn,
    posterUrl: z.string().max(2000).optional().nullable(),
    photoRecordingEnabled: z.boolean(),
    videoRecordingEnabled: z.boolean(),
    liveStreamingEnabled: z.boolean(),
    streamingNoticeText: z.string().max(4000).optional().nullable(),
    streamingConsentRequired: z.boolean().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.registrationStartDate > v.registrationEndDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "신청 시작일은 신청 마감일보다 이전이어야 합니다.",
        path: ["registrationStartDate"],
      });
    }
    if (v.registrationEndDate > v.eventDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "신청 마감일은 대회 일정 이전(또는 당일)이어야 합니다.",
        path: ["registrationEndDate"],
      });
    }
  });

export type CreateEventInput = z.infer<typeof createEventSchema>;

export const updateEventSchema = z
  .object({
    eventId: cuid,
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(8000).optional().nullable(),
    location: trimmedNullable,
    roadAddress: trimmedNullable,
    jibunAddress: trimmedNullable,
    detailAddress: detailAddressField,
    postalCode: postalCodeField,
    locationName: locationNameField,
    eventDate: dateIn.optional(),
    registrationStartDate: dateIn.optional(),
    registrationEndDate: dateIn.optional(),
    posterUrl: z.string().max(2000).optional().nullable(),
    photoRecordingEnabled: z.boolean().optional(),
    videoRecordingEnabled: z.boolean().optional(),
    liveStreamingEnabled: z.boolean().optional(),
    streamingNoticeText: z.string().max(4000).optional().nullable(),
    streamingConsentRequired: z.boolean().optional(),
  })
  .superRefine((v, ctx) => {
    const hasReg =
      v.registrationStartDate !== undefined ||
      v.registrationEndDate !== undefined;
    const hasEvent = v.eventDate !== undefined;
    if (!hasReg && !hasEvent) return;
    const rs = v.registrationStartDate;
    const re = v.registrationEndDate;
    const ed = v.eventDate;
    if (rs !== undefined && re !== undefined && rs > re) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "신청 시작일은 신청 마감일보다 이전이어야 합니다.",
        path: ["registrationStartDate"],
      });
    }
    if (re !== undefined && ed !== undefined && re > ed) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "신청 마감일은 대회 일정 이전(또는 당일)이어야 합니다.",
        path: ["registrationEndDate"],
      });
    }
  })
  .superRefine((v, ctx) => {
    const rest = { ...v };
    delete (rest as { eventId?: string }).eventId;
    const hasAny = Object.values(rest).some((x) => x !== undefined);
    if (!hasAny) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "변경할 필드를 하나 이상 지정해 주세요.",
        path: ["title"],
      });
    }
  });

export type UpdateEventInput = z.infer<typeof updateEventSchema>;

export const changeEventStatusSchema = z.object({
  eventId: cuid,
  status: z.nativeEnum(EventStatus),
});

export type ChangeEventStatusInput = z.infer<typeof changeEventStatusSchema>;

export const createEventDivisionSchema = z.object({
  eventId: cuid,
  sportType: z.string().min(1).max(120),
  ruleType: z.string().max(120).optional().nullable(),
  gender: z.string().max(80).optional().nullable(),
  ageGroup: z.string().max(120).optional().nullable(),
  weightClass: z.string().max(120).optional().nullable(),
  skillLevel: z.string().max(120).optional().nullable(),
});

export type CreateEventDivisionInput = z.infer<typeof createEventDivisionSchema>;

export const updateEventDivisionSchema = z
  .object({
    divisionId: cuid,
    sportType: z.string().min(1).max(120).optional(),
    ruleType: z.string().max(120).optional().nullable(),
    gender: z.string().max(80).optional().nullable(),
    ageGroup: z.string().max(120).optional().nullable(),
    weightClass: z.string().max(120).optional().nullable(),
    skillLevel: z.string().max(120).optional().nullable(),
  })
  .superRefine((v, ctx) => {
    const touched =
      v.sportType !== undefined ||
      v.ruleType !== undefined ||
      v.gender !== undefined ||
      v.ageGroup !== undefined ||
      v.weightClass !== undefined ||
      v.skillLevel !== undefined;
    if (!touched) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "수정할 필드를 하나 이상 지정해 주세요.",
        path: ["sportType"],
      });
    }
  });

export type UpdateEventDivisionInput = z.infer<typeof updateEventDivisionSchema>;

export const deleteEventDivisionSchema = z.object({
  divisionId: cuid,
  eventId: cuid,
});

export type DeleteEventDivisionInput = z.infer<typeof deleteEventDivisionSchema>;

export const upsertEventPaymentSettingSchema = z.object({
  eventId: cuid,
  feeAmount: z.coerce.number().int().min(0).max(100_000_000),
  bankName: z.string().min(1).max(120),
  accountNumber: z.string().min(1).max(80),
  accountHolder: z.string().min(1).max(120),
  depositorRule: z.string().max(500).optional().nullable(),
  paymentDueDate: dateIn.optional().nullable(),
});

export type UpsertEventPaymentSettingInput = z.infer<
  typeof upsertEventPaymentSettingSchema
>;

export const updateSpectatorAccessSchema = z
  .object({
    eventId: cuid,
    spectatorAccessEnabled: z.boolean(),
    spectatorAccessStartAt: dateIn.optional().nullable(),
    spectatorAccessEndAt: dateIn.optional().nullable(),
  })
  .superRefine((v, ctx) => {
    if (!v.spectatorAccessEnabled) return;
    if (!v.spectatorAccessStartAt || !v.spectatorAccessEndAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "관람 공개를 켠 경우 시작·종료 일시가 필요합니다.",
        path: ["spectatorAccessStartAt"],
      });
    }
    if (
      v.spectatorAccessStartAt &&
      v.spectatorAccessEndAt &&
      v.spectatorAccessStartAt > v.spectatorAccessEndAt
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "관람 공개 종료는 시작 이후여야 합니다.",
        path: ["spectatorAccessEndAt"],
      });
    }
  });

export type UpdateSpectatorAccessInput = z.infer<
  typeof updateSpectatorAccessSchema
>;

export const upsertGymEventFeeSettingSchema = z.object({
  eventId: cuid,
  athleteFeeAmount: z.coerce.number().int().min(0).max(100_000_000),
  note: z.string().max(500).optional().nullable(),
});

export type UpsertGymEventFeeSettingInput = z.infer<
  typeof upsertGymEventFeeSettingSchema
>;
