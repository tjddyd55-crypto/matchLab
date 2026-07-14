export const MEMBER_GYM_FILES_BUCKET_ENV = "SUPABASE_MEMBER_GYM_FILES_BUCKET";
export const MEMBER_GYM_FILES_BUCKET_DEFAULT = "member-gym-files";

export const MEMBER_GYM_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const MEMBER_GYM_DOCUMENT_MAX_BYTES = 20 * 1024 * 1024;
export const MEMBER_GYM_UPLOAD_EXPIRES_SEC = 300;
export const MEMBER_GYM_DOWNLOAD_EXPIRES_SEC = 180;
export const MEMBER_GYM_MAX_ATTACHMENTS_PER_TYPE = 3;
export const MEMBER_GYM_MAX_ATTACHMENTS_TOTAL = 20;

export const MEMBER_GYM_ALLOWED_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const MEMBER_GYM_ALLOWED_DOCUMENT_MIME = new Set([
  "application/pdf",
  ...MEMBER_GYM_ALLOWED_IMAGE_MIME,
]);

export function memberGymFilesBucket(): string {
  return (
    process.env.SUPABASE_MEMBER_GYM_FILES_BUCKET?.trim() ||
    MEMBER_GYM_FILES_BUCKET_DEFAULT
  );
}
