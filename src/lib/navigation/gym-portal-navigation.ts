/**
 * 체육관(/gym) 포털 글로벌 네비 SSOT.
 * PC sidebar · 모바일 Sheet가 동일 소스를 사용한다.
 * 대회 목록·신청 내역은 메뉴에 노출한다 (모바일은 더보기 Sheet).
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
      id: "attendance",
      label: "출석 관리",
      items: [
        { href: "/gym/attendance", label: "출석 현황" },
        { href: "/gym/attendance/kiosks", label: "출석 키오스크" },
      ],
    },
    {
      id: "sales",
      label: "매출 관리",
      items: [
        { href: "/gym/sales", label: "매출 현황" },
        { href: "/gym/sales/receivables", label: "미수금" },
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
      id: "events",
      label: "대회",
      items: [
        { href: "/gym/events", label: "대회 목록" },
        { href: "/gym/applications", label: "신청 내역" },
      ],
    },
    {
      id: "profile",
      label: "체육관",
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

/**
 * 기본 메뉴에 노출하지 않는 보조 경로.
 * 대회 목록·신청 내역은 메뉴에 포함되므로 여기 두지 않는다.
 */
export const GYM_PORTAL_HIDDEN_EVENT_HREFS = [
  "/gym/invite-links",
  "/gym/records",
] as const;

/** 메뉴·페이지가 동일하게 쓰는 대회 신청 접근 경로 */
export const GYM_PORTAL_EVENT_APPLICATION_HREFS = [
  "/gym/events",
  "/gym/applications",
] as const;

export function canGymAccessEventApplications(input: {
  role: string;
  gymId: string | null | undefined;
}): boolean {
  return input.role === "gym" && Boolean(input.gymId);
}

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
  if (href === "/gym/events") {
    return (
      pathname === "/gym/events" || pathname.startsWith("/gym/events/")
    );
  }
  if (href === "/gym/applications") {
    return (
      pathname === "/gym/applications" ||
      pathname.startsWith("/gym/applications/")
    );
  }
  if (href === "/gym/attendance") {
    return (
      pathname === "/gym/attendance" ||
      (pathname.startsWith("/gym/attendance/") &&
        !pathname.startsWith("/gym/attendance/kiosks"))
    );
  }
  if (href === "/gym/attendance/kiosks") {
    return (
      pathname === "/gym/attendance/kiosks" ||
      pathname.startsWith("/gym/attendance/kiosks/")
    );
  }
  if (href === "/gym/sales") {
    return (
      pathname === "/gym/sales" ||
      (pathname.startsWith("/gym/sales/") &&
        !pathname.startsWith("/gym/sales/receivables"))
    );
  }
  if (href === "/gym/sales/receivables") {
    return (
      pathname === "/gym/sales/receivables" ||
      pathname.startsWith("/gym/sales/receivables/")
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
