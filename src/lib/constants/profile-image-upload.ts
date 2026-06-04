/** 선수 프로필 사진 — 클라이언트·서버 공통 최대 크기 */
export const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export const PROFILE_IMAGE_ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
