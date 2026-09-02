export const GYM_MEMBER_SPORT_PROFILE_PREFIX = "sport__";
export const GYM_MEMBER_GYM_PROFILE_PREFIX = "gym__";

/** Legacy single-template form name (kept for read compatibility). */
export function sportProfileFormName(stableKey: string) {
  return `${GYM_MEMBER_SPORT_PROFILE_PREFIX}${stableKey}`;
}

/** Multi-sport form name: sport__{templateId}__{stableKey} */
export function sportProfileFormNameForTemplate(
  templateId: string,
  stableKey: string,
) {
  return `${GYM_MEMBER_SPORT_PROFILE_PREFIX}${templateId}__${stableKey}`;
}

export function gymProfileFormName(stableKey: string) {
  return `${GYM_MEMBER_GYM_PROFILE_PREFIX}${stableKey}`;
}
