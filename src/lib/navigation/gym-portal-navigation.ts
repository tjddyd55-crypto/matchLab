/**
 * 회원사(/gym) 포털 글로벌 네비 SSOT.
 * PC sidebar · 모바일 Sheet · bottom nav가 동일 소스를 사용한다.
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
        { href: "/gym/events", label: "대회 공고" },
        { href: "/gym/applications", label: "신청 내역" },
      ],
    },
    {
      id: "profile",
      label: null,
      items: [
        { href: "/gym/profile", label: "체육관 정보" },
        { href: "/gym/associations", label: "협회 연결" },
      ],
    },
  ];
}

/** 평탄화 — bottom nav·검증용 */
export function getGymPortalNavItems(): GymPortalNavItem[] {
  return getGymPortalNavGroups().flatMap((g) => g.items);
}

export function getGymPortalHomePaths(): string[] {
  return ["/gym"];
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
  return pathname === href || pathname.startsWith(`${href}/`);
}
