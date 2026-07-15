import Link from "next/link";
import type { DashboardRole } from "@/components/layout/DashboardShell";
import { getAdminMobileBottomNavItems } from "@/lib/navigation/admin-navigation";
import { getGymPortalNavItems } from "@/lib/navigation/gym-portal-navigation";
import { cn } from "@/lib/utils";

const bottomNavByRole: Record<
  Exclude<DashboardRole, "gym" | "admin">,
  { href: string; label: string }[]
> = {
  organizer: [
    { href: "/organizer", label: "홈" },
    { href: "/organizer/events", label: "대회" },
    { href: "/notifications", label: "알림" },
  ],
  fighter: [
    { href: "/fighter", label: "홈" },
    { href: "/fighter/events", label: "내 대회" },
    { href: "/fighter/records", label: "전적" },
  ],
};

export function MobileBottomNav({
  role,
  className,
}: {
  role: DashboardRole;
  className?: string;
}) {
  const items =
    role === "gym"
      ? getGymPortalNavItems()
      : role === "admin"
        ? getAdminMobileBottomNavItems()
        : bottomNavByRole[role];
  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 flex justify-around border-t border-matchon-border bg-white px-2 py-2 text-xs",
        className,
      )}
      aria-label={
        role === "gym"
          ? "회원사 하단 메뉴"
          : role === "admin"
            ? "관리자 하단 메뉴"
            : "대시보드 하단 메뉴"
      }
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="flex min-h-[44px] flex-1 flex-col items-center justify-center rounded-lg px-0.5 text-center font-medium text-matchon-text-secondary hover:bg-matchon-primary-light hover:text-matchon-primary"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
