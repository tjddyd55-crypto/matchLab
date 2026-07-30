/**
 * 회원 프로필 사진 — private storage 계약.
 * `profile-images`(선수 public)와 분리. DB에는 path만 저장, 화면은 signed read URL.
 * 클라이언트 컴포넌트에서도 import 가능해야 하므로 AppError를 쓰지 않는다.
 */
export const GYM_MEMBER_IMAGE_BUCKET_ENV = "SUPABASE_GYM_MEMBER_IMAGE_BUCKET";
export const GYM_MEMBER_IMAGE_BUCKET_DEFAULT = "gym-member-images";

export const GYM_MEMBER_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export const GYM_MEMBER_IMAGE_UPLOAD_EXPIRES_SEC = 300;
export const GYM_MEMBER_IMAGE_READ_EXPIRES_SEC = 3600;

export const GYM_MEMBER_IMAGE_ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export function gymMemberImagesBucket(): string {
  return (
    process.env[GYM_MEMBER_IMAGE_BUCKET_ENV]?.trim() ||
    GYM_MEMBER_IMAGE_BUCKET_DEFAULT
  );
}

export function isGymMemberImagePathOwned(path: string, gymId: string): boolean {
  const prefix = `gyms/${gymId}/members/`;
  return path.startsWith(prefix) && !path.includes("..");
}

export function assertGymMemberImagePath(path: string, gymId: string): void {
  if (!isGymMemberImagePathOwned(path, gymId)) {
    throw new Error("invalid gym member image path");
  }
}
