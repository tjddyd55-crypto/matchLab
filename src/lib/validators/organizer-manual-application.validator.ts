import { z } from "zod";
import { ApplicationStatus, PaymentStatus } from "@/generated/prisma";
import {
  athleteCareerTextSchema,
  athleteRecordTextSchema,
  optionalInsuranceConsentSchema,
  optionalResidentRegistrationNumberFieldSchema,
} from "@/lib/athlete-application/profile-input";

const genderSchema = z.string().trim().min(1, "성별을 선택해 주세요.");

export const organizerManualApplicationSchema = z
  .object({
    eventId: z.string().min(1),
    applicationWeightKg: z.coerce.number().gt(0).lte(300),
    competitionCategory: z.string().trim().min(1, "경기구분을 선택해 주세요."),
    discipline: z.string().trim().optional(),
    manualDivisionOverride: z.boolean().optional().default(false),
    divisionId: z.string().trim().optional(),
    gymMode: z.enum(["existing", "manual"]),
    gymId: z.string().trim().optional(),
    gymName: z.string().trim().max(120).optional(),
    fighterName: z.string().trim().min(1, "선수 이름을 입력해 주세요."),
    gender: genderSchema,
    birthDate: z.coerce
      .date({ message: "생년월일 형식이 올바르지 않습니다." })
      .optional()
      .nullable(),
    phone: z
      .string()
      .trim()
      .max(20)
      .optional()
      .transform((s) => (s === "" ? undefined : s)),
    guardianName: z
      .string()
      .trim()
      .max(80)
      .optional()
      .transform((s) => (s === "" ? undefined : s)),
    guardianPhone: z
      .string()
      .trim()
      .max(20)
      .optional()
      .transform((s) => (s === "" ? undefined : s)),
    applicationStatus: z
      .enum([ApplicationStatus.approved, ApplicationStatus.pending])
      .default(ApplicationStatus.approved),
    paymentStatus: z
      .enum([
        PaymentStatus.paid,
        PaymentStatus.unpaid,
        PaymentStatus.waived,
        PaymentStatus.pending_check,
      ])
      .default(PaymentStatus.paid),
    memo: z
      .string()
      .trim()
      .max(2000)
      .optional()
      .transform((s) => (s === "" ? undefined : s)),
    recordText: athleteRecordTextSchema,
    careerText: athleteCareerTextSchema,
    totalBouts: z.coerce.number().int().min(0).optional(),
    wins: z.coerce.number().int().min(0).optional(),
    draws: z.coerce.number().int().min(0).optional(),
    losses: z.coerce.number().int().min(0).optional(),
    residentRegistrationNumber: optionalResidentRegistrationNumberFieldSchema,
    insuranceConsentConfirmed: optionalInsuranceConsentSchema,
    confirmDuplicate: z.boolean().optional().default(false),
    linkFighterId: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    const hasStructured =
      data.totalBouts != null ||
      data.wins != null ||
      data.draws != null ||
      data.losses != null;
    if (hasStructured) {
      const totalBouts = data.totalBouts ?? 0;
      const wins = data.wins ?? 0;
      const draws = data.draws ?? 0;
      const losses = data.losses ?? 0;
      if (totalBouts !== wins + draws + losses) {
        ctx.addIssue({
          code: "custom",
          message: "총 경기수와 승·무·패 합계가 일치하지 않습니다.",
          path: ["totalBouts"],
        });
      }
    }
    if (data.manualDivisionOverride && !data.divisionId?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "체급을 선택해 주세요.",
        path: ["divisionId"],
      });
    }
    if (data.gymMode === "existing") {
      if (!data.gymId?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "체육관을 선택해 주세요.",
          path: ["gymId"],
        });
      }
      return;
    }
    if (!data.gymName?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "체육관명을 입력해 주세요.",
        path: ["gymName"],
      });
    }
  });

export type OrganizerManualApplicationInput = z.infer<
  typeof organizerManualApplicationSchema
>;
