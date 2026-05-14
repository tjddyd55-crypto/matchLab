import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

const LINKS = [
  { href: "/admin", label: "대시보드" },
  { href: "/admin/events", label: "대회" },
  { href: "/admin/organizers", label: "주최자" },
  { href: "/admin/gyms", label: "체육관" },
  { href: "/admin/fighters", label: "선수" },
  { href: "/admin/applications", label: "신청" },
  { href: "/admin/results", label: "결과" },
  { href: "/admin/audit-logs", label: "감사 로그" },
] as const;

export function AdminNavStrip() {
  return (
    <nav
      className="border-b bg-muted/30 px-4 py-2 md:px-6"
      aria-label="관리자 하위 메뉴"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap gap-1">
        {LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "shrink-0 text-xs md:text-sm",
            )}
          >
            {item.label}
          </Link>
        ))}
        <Link
          href="/notifications"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "ml-auto shrink-0 text-xs md:text-sm",
          )}
        >
          알림
        </Link>
      </div>
    </nav>
  );
}
