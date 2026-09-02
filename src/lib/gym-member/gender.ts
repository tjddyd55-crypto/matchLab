/** GymMember.gender 표시·비교용 — legacy male/female 과 남/여 호환 */

export function normalizeGymMemberGenderKey(
  value: string | null | undefined,
): "M" | "F" | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (v === "남" || v === "male" || v === "m" || v === "man") return "M";
  if (v === "여" || v === "female" || v === "f" || v === "woman") return "F";
  return null;
}

/** 폼 select(남/여)용 값 */
export function toGymMemberGenderFormValue(
  value: string | null | undefined,
): "" | "남" | "여" {
  const key = normalizeGymMemberGenderKey(value);
  if (key === "M") return "남";
  if (key === "F") return "여";
  return "";
}

/**
 * 수정 저장 시 의미가 같으면 기존 DB 문자열을 유지한다.
 * (male ↔ 남 변환으로 기존 값이 덮어써지지 않게)
 */
export function resolveGymMemberGenderForUpdate(
  incoming: string | null | undefined,
  existing: string | null | undefined,
): string | null {
  const next = incoming?.trim() || null;
  if (!next) return null;
  if (
    normalizeGymMemberGenderKey(next) != null &&
    normalizeGymMemberGenderKey(next) === normalizeGymMemberGenderKey(existing)
  ) {
    return existing ?? next;
  }
  return next;
}
