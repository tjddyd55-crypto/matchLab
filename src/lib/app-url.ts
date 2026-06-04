/**
 * 공개 링크·초대 URL 기준 origin.
 * Railway/Vercel 배포 시 NEXT_PUBLIC_APP_URL 설정을 권장합니다.
 */
export function getAppBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "")}`;
  return "http://localhost:3000";
}
