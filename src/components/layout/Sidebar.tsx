import Link from "next/link";
import { BrandLogo } from "@/components/common/BrandLogo";
import type { DashboardRole } from "@/components/layout/DashboardShell";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string };

const navByRole: Record<DashboardRole, NavItem[]> = {
  organizer: [
    { href: "/organizer", label: "홈" },
    { href: "/organizer/events", label: "대회" },
    { href: "/organizer/application-form-templates", label: "신청서 템플릿" },
    { href: "/organizer/public-fighters", label: "공개 선수" },
    { href: "/organizer/credits", label: "크레딧" },
    { href: "/organizer/division-templates", label: "체급표 템플릿" },
    { href: "/notifications", label: "알림" },
  ],
  gym: [
    { href: "/gym", label: "홈" },
    { href: "/gym/fighters", label: "선수" },
    { href: "/gym/invite-links", label: "등록 링크" },
    { href: "/gym/events", label: "대회" },
    { href: "/gym/applications", label: "신청" },
    { href: "/notifications", label: "알림" },
  ],
  fighter: [
    { href: "/fighter", label: "홈" },
    { href: "/fighter/profile", label: "내 프로필" },
    { href: "/fighter/events", label: "내 대회·경기" },
    { href: "/fighter/records", label: "전적" },
    { href: "/notifications", label: "알림" },
  ],
  admin: [
    { href: "/admin", label: "홈" },
    { href: "/admin/events", label: "대회" },
    { href: "/admin/organizers", label: "주최자" },
    { href: "/admin/gyms", label: "체육관" },
    { href: "/admin/fighters", label: "선수" },
    { href: "/admin/applications", label: "신청" },
    { href: "/admin/results", label: "결과" },
    { href: "/admin/audit-logs", label: "감사" },
    { href: "/notifications", label: "알림" },
  ],
};

function dashboardHomePath(role: DashboardRole): string {
  switch (role) {
    case "organizer":
      return "/organizer";
    case "gym":
      return "/gym";
    case "fighter":
      return "/fighter";
    case "admin":
      return "/admin";
  }
}

export function Sidebar({
  role,
  className,
}: {
  role: DashboardRole;
  className?: string;
}) {
  const items = navByRole[role];

  return (
    <aside className={cn("flex flex-col gap-1 p-3", className)}>
      <div className="mb-3 px-2">
        <BrandLogo href={dashboardHomePath(role)} size="sm" showText />
      </div>
      <nav className="flex flex-col gap-1 text-sm">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-md px-2 py-1.5 hover:bg-muted"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
