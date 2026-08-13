export const GYM_MEMBER_SELF_REG_ADULT_MIN_AGE = 19;

export const GYM_MEMBER_SELF_REG_TIME_BANDS = [
  "morning",
  "afternoon",
  "evening",
  "undecided",
] as const;

export type GymMemberSelfRegTimeBand =
  (typeof GYM_MEMBER_SELF_REG_TIME_BANDS)[number];

export const GYM_MEMBER_SELF_REG_TIME_BAND_LABELS: Record<
  GymMemberSelfRegTimeBand,
  string
> = {
  morning: "오전",
  afternoon: "오후",
  evening: "저녁",
  undecided: "미정",
};

/** GymMember SSOT 성별 값 */
export const GYM_MEMBER_SELF_REG_GENDERS = ["남", "여"] as const;
export type GymMemberSelfRegGender =
  (typeof GYM_MEMBER_SELF_REG_GENDERS)[number];

export const GYM_MEMBER_SELF_REG_GENDER_LABELS: Record<
  GymMemberSelfRegGender,
  string
> = {
  남: "남성",
  여: "여성",
};

export const DEFAULT_SELF_REGISTRATION_TERMS_TITLE = "체육관 이용 안내";

export function buildDefaultSelfRegistrationTermsContent(
  gymName: string,
): string {
  const name = gymName.trim() || "체육관";
  return [
    `${name} 이용 안내`,
    "",
    "1. 시설 이용 시 안전 수칙과 직원 안내를 따라 주세요.",
    "2. 본인 건강 상태에 맞게 운동해 주세요. 이상 증상이 있으면 즉시 중단하고 알려 주세요.",
    "3. 시설과 기구를 소중히 사용해 주세요.",
    "4. 다른 회원에게 피해가 되는 행동은 삼가 주세요.",
    "5. 미성년자는 보호자 동의 후 이용합니다.",
    "",
    "자세한 운영 규칙은 체육관 안내에 따릅니다.",
  ].join("\n");
}

export const SELF_REGISTRATION_SIGNATURE_MAX_BYTES = 2 * 1024 * 1024;
