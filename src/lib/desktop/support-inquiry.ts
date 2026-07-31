/**
 * MATCHON Manager / 관리자 문의 도메인 상수·라벨 SSOT
 */

export const DESKTOP_SUPPORT_INQUIRY_CATEGORIES = [
  "password_help",
  "login_issue",
  "desktop_bug",
  "general",
] as const;

export type DesktopSupportInquiryCategoryCode =
  (typeof DESKTOP_SUPPORT_INQUIRY_CATEGORIES)[number];

export const DESKTOP_SUPPORT_INQUIRY_STATUSES = [
  "open",
  "in_progress",
  "resolved",
  "closed",
] as const;

export type DesktopSupportInquiryStatusCode =
  (typeof DESKTOP_SUPPORT_INQUIRY_STATUSES)[number];

export const DESKTOP_SUPPORT_INQUIRY_SOURCES = ["desktop", "web"] as const;

export type DesktopSupportInquirySourceCode =
  (typeof DESKTOP_SUPPORT_INQUIRY_SOURCES)[number];

export const DESKTOP_SUPPORT_CATEGORY_LABELS: Record<
  DesktopSupportInquiryCategoryCode,
  string
> = {
  password_help: "비밀번호 찾기",
  login_issue: "로그인 문제",
  desktop_bug: "앱 오류",
  general: "일반 문의",
};

export const DESKTOP_SUPPORT_STATUS_LABELS: Record<
  DesktopSupportInquiryStatusCode,
  string
> = {
  open: "접수",
  in_progress: "처리 중",
  resolved: "해결",
  closed: "종료",
};

export function isDesktopSupportInquiryCategory(
  value: string,
): value is DesktopSupportInquiryCategoryCode {
  return (DESKTOP_SUPPORT_INQUIRY_CATEGORIES as readonly string[]).includes(
    value,
  );
}

export function isDesktopSupportInquiryStatus(
  value: string,
): value is DesktopSupportInquiryStatusCode {
  return (DESKTOP_SUPPORT_INQUIRY_STATUSES as readonly string[]).includes(
    value,
  );
}
