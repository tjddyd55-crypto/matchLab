import type { GymMemberDynamicFieldType } from "@/generated/prisma";

export type { GymMemberDynamicFieldType };

export const GYM_MEMBER_DYNAMIC_FIELD_TYPES: GymMemberDynamicFieldType[] = [
  "text",
  "textarea",
  "number",
  "date",
  "select",
  "radio",
  "checkbox",
  "boolean",
];

export const GYM_MEMBER_OPTION_FIELD_TYPES: GymMemberDynamicFieldType[] = [
  "radio",
  "select",
  "checkbox",
];

export function isGymMemberOptionFieldType(
  type: GymMemberDynamicFieldType,
): boolean {
  return GYM_MEMBER_OPTION_FIELD_TYPES.includes(type);
}

export function isGymMemberInputFieldType(
  type: GymMemberDynamicFieldType,
): boolean {
  return GYM_MEMBER_DYNAMIC_FIELD_TYPES.includes(type);
}
