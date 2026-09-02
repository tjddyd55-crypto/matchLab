export const GYM_MEMBER_SPORT_PROFILE_PREFIX = "sport__";
export const GYM_MEMBER_GYM_PROFILE_PREFIX = "gym__";

export function sportProfileFormName(stableKey: string) {
  return `${GYM_MEMBER_SPORT_PROFILE_PREFIX}${stableKey}`;
}

export function gymProfileFormName(stableKey: string) {
  return `${GYM_MEMBER_GYM_PROFILE_PREFIX}${stableKey}`;
}
