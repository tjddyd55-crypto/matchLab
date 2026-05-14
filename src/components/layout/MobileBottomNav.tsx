import Link from "next/link";
import type { DashboardRole } from "@/components/layout/DashboardShell";
import { cn } from "@/lib/utils";

const bottomNavByRole: Record<
  DashboardRole,
  { href: string; label: string }[]
> = {
  organizer: [
    { href: "/organizer", label: "홈" },
    { href: "/organizer/events", label: "대회" },
    { href: "/notifications", label: "알림" },
  ],
  gym: [
    { href: "/gym", label: "홈" },
    { href: "/gym/events", label: "대회" },
    { href: "/gym/applications", label: "신청" },
  ],
  fighter: [
    { href: "/fighter", label: "홈" },
    { href: "/fighter/events", label: "대회" },
    { href: "/fighter/records", label: "전적" },
  ],
  admin: [
    { href: "/admin", label: "홈" },
    { href: "/admin/events", label: "대회" },
    { href: "/admin/applications", label: "신청" },
    { href: "/notifications", label: "알림" },
  ],
};

export function MobileBottomNav({
  role,
  className,
}: {
  role: DashboardRole;
  className?: string;
}) {
  const items = bottomNavByRole[role];
  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 flex justify-around border-t bg-background px-2 py-2 text-xs",
        className,
      )}
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="flex min-h-[44px] flex-1 flex-col items-center justify-center rounded-md hover:bg-muted"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
