export type EventManagementNavGroupId =
  | "setup"
  | "applications"
  | "brackets"
  | "public";

export type EventManagementNavItem = {
  href: string;
  label: string;
  group: EventManagementNavGroupId;
  external?: boolean;
  anchorId?: string;
};

export const EVENT_MANAGEMENT_NAV_GROUP_LABELS: Record<
  EventManagementNavGroupId,
  string
> = {
  setup: "대회 설정",
  applications: "신청/현장",
  brackets: "대진/운영",
  public: "공개/기타",
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
  "setup-staff-links",
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
    { href: base, label: "관리 홈", group: "setup" },
    {
      href: `${base}#setup-basic`,
      label: "기본 설정",
      group: "setup",
      anchorId: "setup-basic",
    },
    {
      href: `${base}#setup-divisions`,
      label: "부문·체급",
      group: "setup",
      anchorId: "setup-divisions",
    },
    {
      href: `${base}#setup-application-form`,
      label: "신청서",
      group: "setup",
      anchorId: "setup-application-form",
    },
    {
      href: `${base}#setup-payment`,
      label: "참가비",
      group: "setup",
      anchorId: "setup-payment",
    },
    { href: `${base}/applications`, label: "신청자", group: "applications" },
    { href: `${base}/check-in`, label: "현장·계체", group: "applications" },
    { href: `${base}/brackets`, label: "대진표", group: "brackets" },
    { href: `${base}/operation`, label: "경기 운영", group: "brackets" },
    { href: `${base}/judges`, label: "심판 관리", group: "brackets" },
    { href: `${base}/qr`, label: "QR 출력", group: "brackets" },
    { href: `${base}/results`, label: "결과", group: "brackets" },
    {
      href: `${base}#setup-staff-links`,
      label: "스태프 링크",
      group: "public",
      anchorId: "setup-staff-links",
    },
    ...(publicSlug
      ? [
          {
            href: `/events/${publicSlug}`,
            label: "공개 공고",
            group: "public" as const,
            external: true,
          },
        ]
      : []),
    {
      href: `${base}/application-batches`,
      label: "공식 신청서",
      group: "public",
    },
    { href: `${base}/live`, label: "라이브 URL", group: "public" },
  ];
}

export function groupEventManagementNavItems(
  items: EventManagementNavItem[],
): { group: EventManagementNavGroupId; label: string; items: EventManagementNavItem[] }[] {
  return EVENT_MANAGEMENT_NAV_GROUP_ORDER.map((group) => ({
    group,
    label: EVENT_MANAGEMENT_NAV_GROUP_LABELS[group],
    items: items.filter((item) => item.group === group),
  })).filter((section) => section.items.length > 0);
}

export function isEventManagementNavItemActive(
  pathname: string,
  hash: string,
  eventId: string,
  item: EventManagementNavItem,
): boolean {
  if (item.external) return false;

  const base = getEventManagementBasePath(eventId);
  const normalizedHash = hash.startsWith("#") ? hash.slice(1) : hash;

  if (item.anchorId) {
    return pathname === base && normalizedHash === item.anchorId;
  }

  if (item.href === base) {
    if (pathname !== base) return false;
    if (!normalizedHash) return true;
    return !SETUP_ANCHOR_IDS.has(normalizedHash);
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
