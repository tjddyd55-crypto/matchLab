import type { GymMemberDynamicFieldType } from "@/generated/prisma";

/**
 * Incompatible type changes destroy meaning of stored values.
 * Same-family changes (select↔radio, text↔textarea) are allowed.
 */
const TYPE_FAMILY: Record<GymMemberDynamicFieldType, string> = {
  text: "string",
  textarea: "string",
  number: "number",
  date: "date",
  select: "option",
  radio: "option",
  checkbox: "option-multi",
  boolean: "boolean",
};

export function isCompatibleGymMemberFieldTypeChange(
  from: GymMemberDynamicFieldType,
  to: GymMemberDynamicFieldType,
): boolean {
  if (from === to) return true;
  return TYPE_FAMILY[from] === TYPE_FAMILY[to];
}

export function assertCompatibleGymMemberFieldTypeChange(
  from: GymMemberDynamicFieldType,
  to: GymMemberDynamicFieldType,
): string | null {
  if (isCompatibleGymMemberFieldTypeChange(from, to)) return null;
  return `이미 저장된 회원 값이 있는 항목은 '${from}'에서 '${to}'(으)로 변경할 수 없습니다.`;
}
