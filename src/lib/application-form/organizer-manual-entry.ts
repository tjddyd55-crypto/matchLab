import type { CustomFormFieldDefinition } from "@/lib/application-form/custom-form";

export const ORGANIZER_MANUAL_ENTRY_SOURCE = "organizer_manual" as const;

export type OrganizerManualEntryMeta = {
  entrySource: typeof ORGANIZER_MANUAL_ENTRY_SOURCE;
  manualCreatedByUserId: string;
};

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

export function buildOrganizerManualAgreementExtras(
  createdByUserId: string,
): OrganizerManualEntryMeta {
  return {
    entrySource: ORGANIZER_MANUAL_ENTRY_SOURCE,
    manualCreatedByUserId: createdByUserId,
  };
}

/** 커스텀 신청서 필수값 우회 — 주최자 직접 등록 기본 답변 */
export function buildOrganizerManualCustomFormAnswers(
  fields: CustomFormFieldDefinition[],
): Record<string, unknown> {
  const answers: Record<string, unknown> = {};
  for (const field of fields) {
    if (field.type === "checkbox") {
      answers[field.id] = field.required ? true : false;
      continue;
    }
    if (field.type === "select" || field.type === "radio") {
      answers[field.id] = field.options?.[0] ?? "주최자 직접 등록";
      continue;
    }
    answers[field.id] = "주최자 직접 등록";
  }
  return answers;
}
