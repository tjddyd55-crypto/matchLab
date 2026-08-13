import { z } from "zod";
import { ApplicationStatus, PaymentStatus } from "@/generated/prisma";
import {
  athleteCareerTextSchema,
  athleteRecordTextSchema,
  insuranceConsentMustAgreeSchema,
  residentRegistrationNumberFieldSchema,
} from "@/lib/athlete-application/profile-input";

const genderSchema = z.string().trim().min(1, "성별을 선택해 주세요.");

export const organizerManualApplicationSchema = z
  .object({
    eventId: z.string().min(1),
    divisionId: z.string().min(1),
    gymMode: z.enum(["existing", "manual"]),
    gymId: z.string().trim().optional(),
    gymName: z.string().trim().max(120).optional(),
    fighterName: z.string().trim().min(1, "선수 이름을 입력해 주세요."),
    gender: genderSchema,
    birthDate: z.coerce.date({ message: "생년월일을 선택해 주세요." }),
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
    residentRegistrationNumber: residentRegistrationNumberFieldSchema,
    insuranceConsentConfirmed: insuranceConsentMustAgreeSchema,
    confirmDuplicate: z.boolean().optional().default(false),
    linkFighterId: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
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
