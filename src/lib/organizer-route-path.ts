/** 주최자 대회 관리(EventManagementLayout) 하위 경로 — /organizer/events/new 제외 */
export function isOrganizerEventManagementPath(pathname: string): boolean {
  return /^\/organizer\/events\/(?!new(?:\/|$))[^/]+(?:\/|$)/.test(pathname);
}
