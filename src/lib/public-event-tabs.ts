export const PUBLIC_EVENT_TABS = [
  { id: "overview", label: "행사 안내" },
  { id: "brackets", label: "대진표" },
  { id: "results", label: "결과" },
  { id: "live", label: "라이브" },
] as const;

export type PublicEventTabId = (typeof PUBLIC_EVENT_TABS)[number]["id"];

export function publicEventTabHref(slug: string, tab: PublicEventTabId): string {
  if (tab === "overview") return `/events/${slug}`;
  return `/events/${slug}?tab=${tab}`;
}

export function parsePublicEventTab(
  raw: string | string[] | undefined,
): PublicEventTabId {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === "brackets") return "brackets";
  if (value === "results") return "results";
  if (value === "live") return "live";
  return "overview";
}

/** 탭 UI 노출용 — liveStreamingEnabled 가 false 이면 live 탭 숨김 */
export function isPublicLiveTabVisible(liveStreamingEnabled: boolean): boolean {
  return liveStreamingEnabled;
}
