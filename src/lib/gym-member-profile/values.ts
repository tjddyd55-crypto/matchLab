import type { GymMemberDynamicFieldType } from "@/generated/prisma";
import { isValidDateOnlyString } from "@/lib/date-only";
import type { GymMemberDynamicFieldDefinition } from "@/lib/gym-member-profile/fields";
import { isGymMemberOptionFieldType } from "@/lib/gym-member-profile/field-types";

export type GymMemberProfileValuePayload =
  | string
  | number
  | boolean
  | string[]
  | null;

export function parseGymMemberProfileValueFromForm(
  raw: FormDataEntryValue | null | undefined,
  type: GymMemberDynamicFieldType,
): GymMemberProfileValuePayload {
  const str = typeof raw === "string" ? raw.trim() : "";
  if (type === "boolean") {
    if (str === "true" || str === "1" || str === "on") return true;
    if (str === "false" || str === "0" || str === "") return false;
    return null;
  }
  if (str === "") return null;
  if (type === "number") {
    const n = Number(str);
    return Number.isFinite(n) ? n : null;
  }
  if (type === "date") {
    return isValidDateOnlyString(str) ? str : null;
  }
  if (type === "checkbox") {
    return str.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return str;
}

export function validateGymMemberProfileValue(
  field: GymMemberDynamicFieldDefinition,
  value: GymMemberProfileValuePayload,
): string | null {
  const empty =
    value === null ||
    value === undefined ||
    value === "" ||
    (Array.isArray(value) && value.length === 0);
  if (field.required && empty) {
    return `"${field.label}"은(는) 필수 입력 항목입니다.`;
  }
  if (empty) return null;
  if (field.type === "number" && typeof value !== "number") {
    return `"${field.label}" 숫자 형식이 올바르지 않습니다.`;
  }
  if (field.type === "date" && typeof value === "string" && !isValidDateOnlyString(value)) {
    return `"${field.label}" 날짜 형식이 올바르지 않습니다.`;
  }
  if (
    isGymMemberOptionFieldType(field.type) &&
    typeof value === "string" &&
    field.options?.length
  ) {
    if (!field.options.includes(value)) {
      return `"${field.label}" 선택값이 올바르지 않습니다.`;
    }
  }
  return null;
}

export function formatGymMemberProfileValueForDisplay(
  type: GymMemberDynamicFieldType,
  valueJson: unknown,
): string {
  if (valueJson === null || valueJson === undefined) return "—";
  if (type === "boolean") {
    if (valueJson === true) return "예";
    if (valueJson === false) return "아니오";
    return "—";
  }
  if (Array.isArray(valueJson)) {
    return valueJson.map(String).join(", ") || "—";
  }
  const s = String(valueJson).trim();
  return s || "—";
}

export function gymMemberProfileValueToJson(
  value: GymMemberProfileValuePayload,
): unknown {
  if (value === null || value === undefined || value === "") return null;
  return value;
}
