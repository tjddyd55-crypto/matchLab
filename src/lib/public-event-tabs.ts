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
  options: { showLive: boolean },
): PublicEventTabId {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === "brackets") return "brackets";
  if (value === "results") return "results";
  if (value === "live" && options.showLive) return "live";
  return "overview";
}
