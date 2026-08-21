import type { AdditionalInfoStatus } from "@/generated/prisma";
import { readInsuranceConsentSnapshot } from "@/lib/athlete-application/insurance-consent";
import { readPrivacyConsentFromAgreementSnapshot } from "@/lib/additional-info/privacy-consent";

export type AdditionalInfoCompletionInput = {
  isMinor: boolean;
  insuranceRrnCipher: Uint8Array | null | undefined;
  insuranceRrnIv: Uint8Array | null | undefined;
  insuranceRrnAuthTag: Uint8Array | null | undefined;
  participantAddress: string | null | undefined;
  insuranceConsentSnapshot: unknown;
  applicationAgreementSnapshot: unknown;
  additionalInfoSignatureObjectKey: string | null | undefined;
  guardianName: string | null | undefined;
  additionalInfoGuardianRelation: string | null | undefined;
};

export function hasEncryptedInsuranceRrn(input: {
  insuranceRrnCipher: Uint8Array | null | undefined;
  insuranceRrnIv: Uint8Array | null | undefined;
  insuranceRrnAuthTag: Uint8Array | null | undefined;
}): boolean {
  return Boolean(
    input.insuranceRrnCipher &&
      input.insuranceRrnCipher.byteLength > 0 &&
      input.insuranceRrnIv &&
      input.insuranceRrnIv.byteLength > 0 &&
      input.insuranceRrnAuthTag &&
      input.insuranceRrnAuthTag.byteLength > 0,
  );
}

export function isAdditionalInfoComplete(
  input: AdditionalInfoCompletionInput,
): boolean {
  if (!hasEncryptedInsuranceRrn(input)) return false;
  if (!(input.participantAddress ?? "").trim()) return false;
  if (!readInsuranceConsentSnapshot(input.insuranceConsentSnapshot)) return false;
  if (!readPrivacyConsentFromAgreementSnapshot(input.applicationAgreementSnapshot)) {
    return false;
  }
  if (!(input.additionalInfoSignatureObjectKey ?? "").trim()) return false;
  if (input.isMinor) {
    if (!(input.guardianName ?? "").trim()) return false;
    if (!(input.additionalInfoGuardianRelation ?? "").trim()) return false;
  }
  return true;
}

export const ADDITIONAL_INFO_STATUS_LABELS: Record<
  AdditionalInfoStatus | "CONTACT_REQUIRED",
  string
> = {
  NOT_REQUESTED: "미요청",
  REQUESTED: "요청완료",
  IN_PROGRESS: "작성중",
  COMPLETED: "완료",
  CONTACT_REQUIRED: "연락처 필요",
};

export function additionalInfoStatusLabel(
  status: AdditionalInfoStatus,
  contactMissing: boolean,
): string {
  if (contactMissing && status !== "COMPLETED") {
    return ADDITIONAL_INFO_STATUS_LABELS.CONTACT_REQUIRED;
  }
  return ADDITIONAL_INFO_STATUS_LABELS[status];
}

export type AdditionalInfoBadgeTone =
  | "muted"
  | "blue"
  | "amber"
  | "green"
  | "red";

export function additionalInfoBadgeTone(
  status: AdditionalInfoStatus,
  contactMissing: boolean,
): AdditionalInfoBadgeTone {
  if (contactMissing && status !== "COMPLETED") return "red";
  switch (status) {
    case "COMPLETED":
      return "green";
    case "IN_PROGRESS":
      return "amber";
    case "REQUESTED":
      return "blue";
    default:
      return "muted";
  }
}
