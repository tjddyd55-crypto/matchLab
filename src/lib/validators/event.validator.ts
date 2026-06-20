import { z } from "zod";
import { EventStatus } from "@/generated/prisma";

const cuid = z.string().min(20).max(32);

const dateIn = z.coerce.date({ message: "날짜 형식이 올바르지 않습니다." });

const eventDateIn = z.coerce.date({ message: "대회 일시를 입력해 주세요." });

const registrationStartDateIn = z.coerce.date({
  message: "신청 시작일을 입력해 주세요.",
});

const registrationEndDateIn = z.coerce.date({
  message: "신청 마감일을 입력해 주세요.",
});

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
  .max(200, "장소명이 너무 깁니다.")
  .optional()
  .nullable()
  .transform((s) => {
    if (s === undefined || s === null) return null;
    const t = s.trim();
    return t === "" ? null : t;
  });

const detailAddressField = z
  .string()
  .max(300, "상세 주소가 너무 깁니다.")
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

const eventVenueFields = {
  location: trimmedNullable,
  roadAddress: trimmedNullable,
  jibunAddress: trimmedNullable,
  detailAddress: detailAddressField,
  postalCode: postalCodeField,
  locationName: locationNameField,
};

const eventRecordingFields = {
  photoRecordingEnabled: z.boolean(),
  videoRecordingEnabled: z.boolean(),
  liveStreamingEnabled: z.boolean(),
  streamingNoticeText: z.string().max(4000).optional().nullable(),
  streamingConsentRequired: z.boolean().optional(),
};

/** refine/superRefine 없음 — .partial() 등 composition의 기준 */
const createEventBaseSchema = z.object({
  organizerId: cuid.optional(),
  title: z
    .string()
    .min(1, "대회명을 입력해 주세요.")
    .max(200, "대회명이 너무 깁니다."),
  description: z.string().max(8000).optional().nullable(),
  ...eventVenueFields,
  eventDate: eventDateIn,
  registrationStartDate: registrationStartDateIn,
  registrationEndDate: registrationEndDateIn,
  posterUrl: z.string().max(2000).optional().nullable(),
  ...eventRecordingFields,
});

const updateEventBaseSchema = z.object({
  eventId: cuid,
  title: z
    .string()
    .min(1, "대회명을 입력해 주세요.")
    .max(200, "대회명이 너무 깁니다.")
    .optional(),
  description: z.string().max(8000).optional().nullable(),
  ...eventVenueFields,
  eventDate: eventDateIn.optional(),
  registrationStartDate: registrationStartDateIn.optional(),
  registrationEndDate: registrationEndDateIn.optional(),
  posterUrl: z.string().max(2000).optional().nullable(),
  photoRecordingEnabled: z.boolean().optional(),
  videoRecordingEnabled: z.boolean().optional(),
  liveStreamingEnabled: z.boolean().optional(),
  streamingNoticeText: z.string().max(4000).optional().nullable(),
  streamingConsentRequired: z.boolean().optional(),
});

function refineCreateEventDates(
  v: {
    registrationStartDate: Date;
    registrationEndDate: Date;
    eventDate: Date;
  },
  ctx: z.RefinementCtx,
): void {
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
}

function refineUpdateEventDates(
  v: {
    registrationStartDate?: Date;
    registrationEndDate?: Date;
    eventDate?: Date;
  },
  ctx: z.RefinementCtx,
): void {
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
}

export const createEventSchema = createEventBaseSchema.superRefine(
  refineCreateEventDates,
);

export type CreateEventInput = z.infer<typeof createEventSchema>;

export const updateEventSchema = updateEventBaseSchema
  .superRefine(refineUpdateEventDates)
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

const createEventDivisionBaseSchema = z.object({
  eventId: cuid,
  sportType: z.string().min(1).max(120),
  ruleType: z.string().max(120).optional().nullable(),
  gender: z.string().max(80).optional().nullable(),
  ageGroup: z.string().max(120).optional().nullable(),
  weightClass: z.string().max(120).optional().nullable(),
  skillLevel: z.string().max(120).optional().nullable(),
});

export const createEventDivisionSchema = createEventDivisionBaseSchema;

export type CreateEventDivisionInput = z.infer<typeof createEventDivisionSchema>;

const updateEventDivisionBaseSchema = z.object({
  divisionId: cuid,
  sportType: z.string().min(1).max(120).optional(),
  ruleType: z.string().max(120).optional().nullable(),
  gender: z.string().max(80).optional().nullable(),
  ageGroup: z.string().max(120).optional().nullable(),
  weightClass: z.string().max(120).optional().nullable(),
  skillLevel: z.string().max(120).optional().nullable(),
});

export const updateEventDivisionSchema = updateEventDivisionBaseSchema.superRefine(
  (v, ctx) => {
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
  },
);

export type UpdateEventDivisionInput = z.infer<typeof updateEventDivisionSchema>;

export const changeEventStatusSchema = z.object({
  eventId: cuid,
  status: z.nativeEnum(EventStatus),
});

export type ChangeEventStatusInput = z.infer<typeof changeEventStatusSchema>;

export const deleteEventDivisionSchema = z.object({
  divisionId: cuid,
  eventId: cuid,
});

export type DeleteEventDivisionInput = z.infer<typeof deleteEventDivisionSchema>;

export const upsertEventPaymentSettingSchema = z
  .object({
    eventId: cuid,
    feeEnabled: z.boolean(),
    feeAmount: z.coerce.number().int().min(0).max(100_000_000).optional(),
    bankName: z.string().max(120).optional(),
    accountNumber: z.string().max(80).optional(),
    accountHolder: z.string().max(120).optional(),
    depositorRule: z.string().max(500).optional().nullable(),
    paymentDueDate: dateIn.optional().nullable(),
  })
  .superRefine((v, ctx) => {
    if (!v.feeEnabled) return;
    if (v.feeAmount == null || Number.isNaN(v.feeAmount)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "참가비 금액을 입력해 주세요.",
        path: ["feeAmount"],
      });
    }
    if (!v.bankName?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "은행명을 입력해 주세요.",
        path: ["bankName"],
      });
    }
    if (!v.accountNumber?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "계좌번호를 입력해 주세요.",
        path: ["accountNumber"],
      });
    }
    if (!v.accountHolder?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "예금주를 입력해 주세요.",
        path: ["accountHolder"],
      });
    }
  });

export type UpsertEventPaymentSettingInput = z.infer<
  typeof upsertEventPaymentSettingSchema
>;

const updateSpectatorAccessBaseSchema = z.object({
  eventId: cuid,
  spectatorAccessEnabled: z.boolean(),
  spectatorAccessStartAt: dateIn.optional().nullable(),
  spectatorAccessEndAt: dateIn.optional().nullable(),
});

export const updateSpectatorAccessSchema =
  updateSpectatorAccessBaseSchema.superRefine((v, ctx) => {
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
