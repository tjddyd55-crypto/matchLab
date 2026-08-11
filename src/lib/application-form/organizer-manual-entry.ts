import type { CustomFormFieldDefinition } from "@/lib/application-form/custom-form";

export const ORGANIZER_MANUAL_ENTRY_SOURCE = "organizer_manual" as const;
export const EXTERNAL_LINK_ENTRY_SOURCE = "external_link" as const;

export type ManualEntrySource =
  | typeof ORGANIZER_MANUAL_ENTRY_SOURCE
  | typeof EXTERNAL_LINK_ENTRY_SOURCE;

export type OrganizerManualEntryMeta = {
  entrySource: typeof ORGANIZER_MANUAL_ENTRY_SOURCE;
  manualCreatedByUserId: string;
};

export type ExternalLinkEntryMeta = {
  entrySource: typeof EXTERNAL_LINK_ENTRY_SOURCE;
  externalLinkId: string;
  clientSubmissionId: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
};

export type ApplicationEntryMeta =
  | OrganizerManualEntryMeta
  | ExternalLinkEntryMeta;

export function readOrganizerManualEntryFromAgreementSnapshot(
  snapshot: unknown,
): OrganizerManualEntryMeta | null {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return null;
  }
  const o = snapshot as Record<string, unknown>;
  if (o.entrySource !== ORGANIZER_MANUAL_ENTRY_SOURCE) {
    return null;
  }
  if (typeof o.manualCreatedByUserId !== "string") {
    return null;
  }
  return {
    entrySource: ORGANIZER_MANUAL_ENTRY_SOURCE,
    manualCreatedByUserId: o.manualCreatedByUserId,
  };
}

export function readExternalLinkEntryFromAgreementSnapshot(
  snapshot: unknown,
): ExternalLinkEntryMeta | null {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return null;
  }
  const o = snapshot as Record<string, unknown>;
  if (o.entrySource !== EXTERNAL_LINK_ENTRY_SOURCE) {
    return null;
  }
  if (typeof o.externalLinkId !== "string") return null;
  if (typeof o.clientSubmissionId !== "string") return null;
  return {
    entrySource: EXTERNAL_LINK_ENTRY_SOURCE,
    externalLinkId: o.externalLinkId,
    clientSubmissionId: o.clientSubmissionId,
    contactName: typeof o.contactName === "string" ? o.contactName : undefined,
    contactPhone:
      typeof o.contactPhone === "string" ? o.contactPhone : undefined,
    contactEmail:
      typeof o.contactEmail === "string" ? o.contactEmail : undefined,
  };
}

export function readApplicationEntrySource(
  snapshot: unknown,
): ManualEntrySource | null {
  if (readOrganizerManualEntryFromAgreementSnapshot(snapshot)) {
    return ORGANIZER_MANUAL_ENTRY_SOURCE;
  }
  if (readExternalLinkEntryFromAgreementSnapshot(snapshot)) {
    return EXTERNAL_LINK_ENTRY_SOURCE;
  }
  return null;
}

export function buildOrganizerManualAgreementExtras(
  createdByUserId: string,
): OrganizerManualEntryMeta {
  return {
    entrySource: ORGANIZER_MANUAL_ENTRY_SOURCE,
    manualCreatedByUserId: createdByUserId,
  };
}

export function buildExternalLinkAgreementExtras(input: {
  externalLinkId: string;
  clientSubmissionId: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
}): ExternalLinkEntryMeta {
  return {
    entrySource: EXTERNAL_LINK_ENTRY_SOURCE,
    externalLinkId: input.externalLinkId,
    clientSubmissionId: input.clientSubmissionId,
    contactName: input.contactName,
    contactPhone: input.contactPhone,
    contactEmail: input.contactEmail,
  };
}

/** 커스텀 신청서 필수값 우회 — 주최자 직접 등록 / 외부링크 기본 답변 */
export function buildOrganizerManualCustomFormAnswers(
  fields: CustomFormFieldDefinition[],
  placeholder = "주최자 직접 등록",
): Record<string, unknown> {
  const answers: Record<string, unknown> = {};
  for (const field of fields) {
    if (field.type === "checkbox") {
      answers[field.id] = field.required ? true : false;
      continue;
    }
    if (field.type === "select" || field.type === "radio") {
      answers[field.id] = field.options?.[0] ?? placeholder;
      continue;
    }
    answers[field.id] = placeholder;
  }
  return answers;
}
