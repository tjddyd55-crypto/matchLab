import type { OrganizerType } from "@/lib/enums";

export type OrganizerGlobalNavItem = {
  href: string;
  label: string;
};

export type OrganizerGlobalNavGroup = {
  id: string;
  label: string | null;
  items: OrganizerGlobalNavItem[];
};

/**
 * 주최자 글로벌 메뉴 SSOT (PC sidebar · 모바일 Sheet 공통).
 * 회원사 관리는 association organizer만 포함.
 */
export function getOrganizerGlobalNavGroups(input: {
  organizerType?: OrganizerType | null;
  /** admin이 organizer UI를 볼 때 회원사 메뉴 노출 여부 */
  forceMemberGymNav?: boolean;
}): OrganizerGlobalNavGroup[] {
  const showMemberGym =
    input.forceMemberGymNav === true ||
    input.organizerType === "association";

  const groups: OrganizerGlobalNavGroup[] = [
    {
      id: "home",
      label: null,
      items: [{ href: "/organizer", label: "홈" }],
    },
    {
      id: "events",
      label: "대회",
      items: [
        { href: "/organizer/events", label: "대회 목록" },
        { href: "/organizer/events/new", label: "새 대회 만들기" },
      ],
    },
  ];

  if (showMemberGym) {
    groups.push({
      id: "member-gyms",
      label: "회원사 관리",
      items: [
        { href: "/organizer/member-gyms/overview", label: "회원사 현황" },
        { href: "/organizer/member-gyms/links", label: "가입 링크" },
        { href: "/organizer/member-gyms/applications", label: "가입 신청" },
        { href: "/organizer/member-gyms", label: "회원사 목록" },
        { href: "/organizer/member-gyms/settings", label: "환경 설정" },
      ],
    });
  }

  groups.push(
    {
      id: "fighters",
      label: "선수",
      items: [{ href: "/organizer/public-fighters", label: "선수 목록" }],
    },
    {
      id: "tools",
      label: "공통 도구",
      items: [
        {
          href: "/organizer/application-form-templates",
          label: "신청서 템플릿",
        },
        { href: "/organizer/division-templates", label: "체급표 템플릿" },
        { href: "/organizer/credits", label: "크레딧" },
        { href: "/notifications", label: "알림" },
      ],
    },
  );

  return groups;
}

export function flattenOrganizerGlobalNav(
  groups: OrganizerGlobalNavGroup[],
): OrganizerGlobalNavItem[] {
  return groups.flatMap((g) => g.items);
}

export function isOrganizerMemberGymPath(pathname: string): boolean {
  return (
    pathname === "/organizer/member-gyms" ||
    pathname.startsWith("/organizer/member-gyms/")
  );
}
