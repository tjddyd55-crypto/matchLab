import type { GymMemberDynamicFieldType } from "@/generated/prisma";

/** 12-column member form/detail grid spans */
export type MemberFieldGridSpan = 2 | 3 | 4 | 6 | 8 | 12;

export type MemberFieldSize = "compact" | "standard" | "wide" | "full";

export const MEMBER_FIELD_SIZE_SPAN: Record<MemberFieldSize, MemberFieldGridSpan> =
  {
    compact: 3,
    standard: 4,
    wide: 6,
    full: 12,
  };

/** Form content max width — prevents endless stretch on 1920+ */
export const MEMBER_FORM_MAX_WIDTH_CLASS = "mx-auto w-full max-w-[78rem]";

/**
 * Field type → default desktop grid span.
 * Short controls stay compact; long text expands.
 */
export function getMemberFieldGridSpan(
  type: GymMemberDynamicFieldType | string,
): MemberFieldGridSpan {
  switch (type) {
    case "textarea":
      return 12;
    case "radio":
    case "checkbox":
      return 6;
    case "text":
      return 4;
    case "select":
    case "boolean":
    case "date":
    case "number":
      return 3;
    default:
      return 4;
  }
}

/** Known sport template field keys with intentional spans */
export function getSportFieldGridSpan(
  stableKey: string,
  type?: string,
): MemberFieldGridSpan {
  switch (stableKey) {
    case "competitionExperienceNote":
      return 6;
    case "memberType":
    case "weightClass":
    case "trainingExperience":
    case "stance":
    case "sparringAvailable":
    case "competitionParticipation":
      return 3;
    default:
      return type ? getMemberFieldGridSpan(type) : 3;
  }
}

export function memberGridSpanClass(span: MemberFieldGridSpan): string {
  switch (span) {
    case 2:
      return "col-span-12 sm:col-span-6 lg:col-span-2";
    case 3:
      return "col-span-12 sm:col-span-6 lg:col-span-3";
    case 4:
      return "col-span-12 sm:col-span-6 lg:col-span-4";
    case 6:
      return "col-span-12 sm:col-span-6 lg:col-span-6";
    case 8:
      return "col-span-12 lg:col-span-8";
    case 12:
      return "col-span-12";
    default:
      return "col-span-12 sm:col-span-6 lg:col-span-4";
  }
}
