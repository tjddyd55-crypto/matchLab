export const DIVISION_TEMPLATE_SPORT_TYPES = [
  "muaythai",
  "kickboxing",
  "boxing",
  "custom",
] as const;

export type DivisionTemplateSportType =
  (typeof DIVISION_TEMPLATE_SPORT_TYPES)[number];

export const DIVISION_TEMPLATE_SPORT_LABELS: Record<
  DivisionTemplateSportType,
  string
> = {
  muaythai: "무에타이",
  kickboxing: "킥복싱",
  boxing: "복싱",
  custom: "기타",
};

export const DIVISION_TEMPLATE_AGE_GROUPS = [
  "초등부",
  "중등부",
  "고등부",
  "대학·일반부",
] as const;

export type DivisionTemplateAgeGroup =
  (typeof DIVISION_TEMPLATE_AGE_GROUPS)[number];

export const DIVISION_TEMPLATE_GENDERS = ["male", "female"] as const;

export type DivisionTemplateGender =
  (typeof DIVISION_TEMPLATE_GENDERS)[number];

export const DIVISION_TEMPLATE_GENDER_LABELS: Record<
  DivisionTemplateGender,
  string
> = {
  male: "남성",
  female: "여성",
};

export const DIVISION_TEMPLATE_LIMIT_TYPES = [
  "under",
  "over",
  "range",
] as const;

export type DivisionTemplateLimitType =
  (typeof DIVISION_TEMPLATE_LIMIT_TYPES)[number];
