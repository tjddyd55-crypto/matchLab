/**
 * 대회 관리 내비게이션 SSOT — 대분류 · 소분류 · active matcher
 */

export type EventManagementNavGroupId =
  | "setup"
  | "applications"
  | "brackets"
  | "public";

export type EventManagementNavIconKey =
  | "home"
  | "settings"
  | "layers"
  | "file-text"
  | "wallet"
  | "users"
  | "clipboard-check"
  | "git-branch"
  | "list-ordered"
  | "swords"
  | "map-pin"
  | "gavel"
  | "qr-code"
  | "trophy"
  | "globe"
  | "files"
  | "radio";

export type EventManagementNavItem = {
  href: string;
  label: string;
  group: EventManagementNavGroupId;
  icon: EventManagementNavIconKey;
  external?: boolean;
  anchorId?: string;
};

export type EventManagementGroup = {
  id: EventManagementNavGroupId;
  label: string;
  items: EventManagementNavItem[];
};

export const EVENT_MANAGEMENT_NAV_GROUP_LABELS: Record<
  EventManagementNavGroupId,
  string
> = {
  setup: "설정",
  applications: "신청",
  brackets: "대진·운영",
  public: "공개",
};

export const EVENT_MANAGEMENT_NAV_GROUP_ORDER: EventManagementNavGroupId[] = [
  "setup",
  "applications",
  "brackets",
  "public",
];

const SETUP_ANCHOR_IDS = new Set([
  "setup-basic",
  "setup-divisions",
  "setup-application-form",
  "setup-payment",
]);

export function getEventManagementBasePath(eventId: string): string {
  return `/organizer/events/${eventId}`;
}

export function getEventManagementNavItems(
  eventId: string,
  publicSlug?: string | null,
): EventManagementNavItem[] {
  const base = getEventManagementBasePath(eventId);

  return [
    { href: base, label: "관리 홈", group: "setup", icon: "home" },
    {
      href: `${base}#setup-basic`,
      label: "기본 설정",
      group: "setup",
      icon: "settings",
      anchorId: "setup-basic",
    },
    {
      href: `${base}#setup-divisions`,
      label: "경기구분·체급",
      group: "setup",
      icon: "layers",
      anchorId: "setup-divisions",
    },
    {
      href: `${base}#setup-application-form`,
      label: "신청서",
      group: "setup",
      icon: "file-text",
      anchorId: "setup-application-form",
    },
    {
      href: `${base}#setup-payment`,
      label: "참가비",
      group: "setup",
      icon: "wallet",
      anchorId: "setup-payment",
    },
    {
      href: `${base}/applications`,
      label: "신청자",
      group: "applications",
      icon: "users",
    },
    {
      href: `${base}/check-in`,
      label: "현장·계체",
      group: "applications",
      icon: "clipboard-check",
    },
    { href: `${base}/brackets?tab=view&view=workspace`, label: "대진표", group: "brackets", icon: "git-branch" },
    {
      href: `${base}/brackets?tab=view`,
      label: "전체순서",
      group: "brackets",
      icon: "list-ordered",
    },
    { href: `${base}/operation`, label: "경기 운영", group: "brackets", icon: "swords" },
    {
      href: `${base}/field-status`,
      label: "경기장 현황",
      group: "brackets",
      icon: "map-pin",
    },
    { href: `${base}/judges`, label: "심판 관리", group: "brackets", icon: "gavel" },
    { href: `${base}/qr`, label: "QR 출력", group: "brackets", icon: "qr-code" },
    { href: `${base}/results`, label: "결과", group: "brackets", icon: "trophy" },
    ...(publicSlug
      ? [
          {
            href: `/events/${publicSlug}`,
            label: "공개 공고",
            group: "public" as const,
            icon: "globe" as const,
            external: true,
          },
        ]
      : []),
    {
      href: `${base}/application-batches`,
      label: "공식 신청서",
      group: "public",
      icon: "files",
    },
    { href: `${base}/live`, label: "라이브 URL", group: "public", icon: "radio" },
  ];
}

export function groupEventManagementNavItems(
  items: EventManagementNavItem[],
): EventManagementGroup[] {
  return EVENT_MANAGEMENT_NAV_GROUP_ORDER.map((id) => ({
    id,
    label: EVENT_MANAGEMENT_NAV_GROUP_LABELS[id],
    items: items.filter((item) => item.group === id),
  })).filter((section) => section.items.length > 0);
}

export function isEventManagementNavItemActive(
  pathname: string,
  hash: string,
  eventId: string,
  item: EventManagementNavItem,
  search = "",
): boolean {
  if (item.external) return false;

  const base = getEventManagementBasePath(eventId);
  const normalizedHash = hash.startsWith("#") ? hash.slice(1) : hash;
  const searchParams = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );

  if (item.anchorId) {
    return pathname === base && normalizedHash === item.anchorId;
  }

  const bracketsWorkspaceHref = `${base}/brackets?tab=view&view=workspace`;

  if (item.href === `${base}/brackets?tab=view`) {
    return (
      pathname === `${base}/schedule` ||
      (pathname === `${base}/brackets` &&
        searchParams.get("tab") === "view" &&
        searchParams.get("view") !== "workspace")
    );
  }

  if (item.href === bracketsWorkspaceHref) {
    if (pathname !== `${base}/brackets`) return false;
    const tab = searchParams.get("tab");
    const view = searchParams.get("view");
    if (tab === "view" && view === "workspace") return true;
    if (tab === "settings" || tab === "generate") return true;
    if (!tab) return false;
    return false;
  }

  if (item.href === `${base}/brackets`) {
    if (pathname === `${base}/brackets` && searchParams.get("tab") === "view") {
      return false;
    }
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  if (item.href === `${base}/applications`) {
    return (
      pathname === item.href || pathname.startsWith(`${item.href}/`)
    );
  }

  if (item.href === `${base}/application-batches`) {
    return (
      pathname === item.href || pathname.startsWith(`${item.href}/`)
    );
  }

  if (item.href === base) {
    if (pathname !== base) return false;
    if (!normalizedHash) return true;
    return !SETUP_ANCHOR_IDS.has(normalizedHash);
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function resolveActiveEventManagementNavItem(
  pathname: string,
  hash: string,
  eventId: string,
  items: EventManagementNavItem[],
  search = "",
): EventManagementNavItem | undefined {
  return items.find((item) =>
    isEventManagementNavItemActive(pathname, hash, eventId, item, search),
  );
}

export function resolveActiveEventManagementNavGroupId(
  pathname: string,
  hash: string,
  eventId: string,
  items: EventManagementNavItem[],
  search = "",
): EventManagementNavGroupId {
  return (
    resolveActiveEventManagementNavItem(pathname, hash, eventId, items, search)
      ?.group ?? "setup"
  );
}

export function getEventManagementGroupHref(
  eventId: string,
  group: EventManagementGroup,
): string {
  return group.items[0]?.href ?? getEventManagementBasePath(eventId);
}
