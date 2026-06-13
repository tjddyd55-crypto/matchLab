import { getServerAppBaseUrl } from "@/lib/qr-url";

/**
 * 공개 링크·초대 URL 기준 origin.
 * Railway/Vercel 배포 시 NEXT_PUBLIC_APP_URL 설정을 권장합니다.
 */
export function getAppBaseUrl(): string {
  return getServerAppBaseUrl();
}
