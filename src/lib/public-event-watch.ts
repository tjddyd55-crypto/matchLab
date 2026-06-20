export const SPECTATOR_WATCH_TABS = [
  { id: "brackets", label: "대진표" },
  { id: "results", label: "결과" },
  { id: "live", label: "라이브" },
] as const;

export type SpectatorWatchTabId = (typeof SPECTATOR_WATCH_TABS)[number]["id"];

export function spectatorWatchHref(
  slug: string,
  tab: SpectatorWatchTabId = "brackets",
): string {
  return `/events/${slug}/watch?tab=${tab}`;
}

export function parseSpectatorWatchTab(
  raw: string | string[] | undefined,
): SpectatorWatchTabId {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === "results") return "results";
  if (value === "live") return "live";
  return "brackets";
}

export function spectatorWatchTabLabel(tab: SpectatorWatchTabId): string {
  return SPECTATOR_WATCH_TABS.find((t) => t.id === tab)?.label ?? "대진표";
}
