/** 주최자 대회 관리(EventManagementLayout) 하위 경로 — /organizer/events/new 제외 */
export function isOrganizerEventManagementPath(pathname: string): boolean {
  return /^\/organizer\/events\/(?!new(?:\/|$))[^/]+(?:\/|$)/.test(pathname);
}

export function extractOrganizerEventIdFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/organizer\/events\/(?!new(?:\/|$))([^/]+)/);
  return m?.[1] ?? null;
}
