/**
 * 회원 포털 이름 정규화.
 * GymMember 저장 SSOT는 `.trim()` — 비교 시 trim + 연속 공백 축약으로 입력 오차만 흡수.
 * 초성·유사 이름 매칭 금지.
 */
export function normalizeGymMemberPortalName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function gymMemberPortalNamesEqual(
  inputName: string,
  storedName: string,
): boolean {
  return (
    normalizeGymMemberPortalName(inputName) ===
    normalizeGymMemberPortalName(storedName)
  );
}
