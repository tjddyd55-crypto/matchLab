import { z } from "zod";

const agreementFlag = z
  .string()
  .refine((v) => v === "true", "필수 동의 항목입니다.");

export const completeGuardianConsentFormSchema = z
  .object({
    consentId: z.string().min(1),
    scope: z.enum(["registration", "application"]).optional(),
    registrationSubmissionId: z.string().optional(),
    token: z.string().optional(),
    signatureImagePath: z.string().min(1),
  guardianName: z.string().trim().min(1, "보호자 이름을 입력해 주세요."),
  guardianPhone: z.string().trim().min(1, "보호자 연락처를 입력해 주세요."),
  relationship: z.string().trim().min(1, "관계를 입력해 주세요."),
  privacyAgreed: agreementFlag,
  riskAgreed: agreementFlag,
  emergencyAgreed: agreementFlag,
  resultDisclosureAgreed: agreementFlag,
  photoVideoAgreed: agreementFlag,
})
  .superRefine((data, ctx) => {
    if (data.scope === "application") return;
    if (!data.registrationSubmissionId?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "등록 요청 정보가 필요합니다.",
        path: ["registrationSubmissionId"],
      });
    }
    if (!data.token?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "초대 토큰이 필요합니다.",
        path: ["token"],
      });
    }
  });

export type CompleteGuardianConsentFormValues = z.infer<
  typeof completeGuardianConsentFormSchema
>;
