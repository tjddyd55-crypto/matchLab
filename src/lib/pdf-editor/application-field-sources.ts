export type ApplicationFieldSourceGroup = {
  label: string;
  options: { value: string; label: string }[];
};

/** 대회 신청서 ApplicationDocument snapshot source 목록 */
export const APPLICATION_FIELD_SOURCE_GROUPS: ApplicationFieldSourceGroup[] = [
  {
    label: "대회",
    options: [
      { value: "event.title", label: "대회명" },
      { value: "event.date", label: "대회일" },
      { value: "event.location", label: "장소" },
    ],
  },
  {
    label: "체육관",
    options: [
      { value: "gym.name", label: "체육관명" },
      { value: "gym.ownerName", label: "대표자명" },
      { value: "gym.phoneMasked", label: "연락처(마스킹)" },
    ],
  },
  {
    label: "선수",
    options: [
      { value: "fighter.name", label: "선수명" },
      { value: "fighter.birthDate", label: "생년월일" },
      { value: "fighter.gender", label: "성별" },
      { value: "fighter.weight", label: "체중" },
      { value: "fighter.recordSummary", label: "전적 요약" },
    ],
  },
  {
    label: "신청",
    options: [
      { value: "application.division", label: "신청 경기구분" },
      { value: "application.weightClass", label: "체급" },
    ],
  },
  {
    label: "선수 서명",
    options: [
      { value: "athlete.consentStatus", label: "선수 동의 상태" },
      { value: "athlete.signedAt", label: "선수 서명일" },
      { value: "athlete.signatureImage", label: "선수 서명 이미지" },
    ],
  },
  {
    label: "보호자",
    options: [
      { value: "guardian.consentStatus", label: "보호자 동의 상태" },
      { value: "guardian.signedAt", label: "보호자 동의일" },
      { value: "guardian.signatureImage", label: "보호자 서명 이미지" },
    ],
  },
  {
    label: "수동",
    options: [{ value: "manual", label: "수동 입력(manual.*)" }],
  },
];

export const ALL_APPLICATION_FIELD_SOURCES = APPLICATION_FIELD_SOURCE_GROUPS.flatMap(
  (g) => g.options.map((o) => o.value),
);

export function labelForApplicationFieldSource(source: string): string {
  for (const g of APPLICATION_FIELD_SOURCE_GROUPS) {
    const hit = g.options.find((o) => o.value === source);
    if (hit) return hit.label;
  }
  return source;
}
