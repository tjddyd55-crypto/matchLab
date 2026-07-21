/**
 * 회원사(/gym) 포털 글로벌 네비 SSOT.
 * PC sidebar · 모바일 Sheet가 동일 소스를 사용한다.
 * 대회·신청 route는 유지하되 기본 메뉴에는 노출하지 않는다.
 */

export type GymPortalNavItem = {
  href: string;
  label: string;
};

export type GymPortalNavGroup = {
  id: string;
  /** null이면 섹션 헤더 없이 items만 렌더 */
  label: string | null;
  items: GymPortalNavItem[];
};

export function getGymPortalNavGroups(): GymPortalNavGroup[] {
  return [
    {
      id: "home",
      label: null,
      items: [{ href: "/gym", label: "홈" }],
    },
    {
      id: "members",
      label: "회원 관리",
      items: [
        { href: "/gym/members", label: "전체 회원" },
        { href: "/gym/members/new", label: "회원 등록" },
        { href: "/gym/membership-plans", label: "이용권 관리" },
      ],
    },
    {
      id: "fighters",
      label: "선수 관리",
      items: [
        { href: "/gym/fighters", label: "선수 목록" },
        { href: "/gym/fighters/new", label: "선수 등록" },
      ],
    },
    {
      id: "profile",
      label: null,
      items: [{ href: "/gym/profile", label: "체육관 정보" }],
    },
  ];
}

/** 평탄화 — 검증·시트용 */
export function getGymPortalNavItems(): GymPortalNavItem[] {
  return getGymPortalNavGroups().flatMap((g) => g.items);
}

/**
 * 모바일 bottom nav — 핵심만.
 * 전체 그룹을 flat으로 넣지 않는다.
 */
export function getGymPortalMobileBottomNavItems(): GymPortalNavItem[] {
  return [
    { href: "/gym", label: "홈" },
    { href: "/gym/members", label: "회원" },
    { href: "/gym/fighters", label: "선수" },
    { href: "/gym/profile", label: "더보기" },
  ];
}

export function getGymPortalHomePaths(): string[] {
  return ["/gym"];
}

/** 기본 메뉴에 나오면 안 되는 대회·신청 경로 */
export const GYM_PORTAL_HIDDEN_EVENT_HREFS = [
  "/gym/events",
  "/gym/applications",
  "/gym/invite-links",
  "/gym/records",
] as const;

export function isGymPortalNavItemActive(
  href: string,
  pathname: string,
): boolean {
  if (getGymPortalHomePaths().includes(href)) {
    return pathname === href;
  }
  if (href === "/gym/fighters") {
    return (
      pathname === "/gym/fighters" ||
      (pathname.startsWith("/gym/fighters/") &&
        !pathname.startsWith("/gym/fighters/new"))
    );
  }
  if (href === "/gym/members") {
    return (
      pathname === "/gym/members" ||
      (pathname.startsWith("/gym/members/") &&
        !pathname.startsWith("/gym/members/new"))
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
