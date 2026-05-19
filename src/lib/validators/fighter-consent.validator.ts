import { z } from "zod";

export const completeFighterConsentByTokenSchema = z.object({
  token: z.string().min(1),
  signatureImagePath: z.string().min(1),
  privacyAgreed: z.literal(true),
  riskAgreed: z.literal(true),
  emergencyAgreed: z.literal(true),
  resultDisclosureAgreed: z.literal(true),
  photoVideoAgreed: z.literal(true),
  manualValues: z.record(z.string(), z.unknown()).optional(),
});

export type CompleteFighterConsentByTokenInput = z.infer<
  typeof completeFighterConsentByTokenSchema
>;
