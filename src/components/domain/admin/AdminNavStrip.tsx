import Link from "next/link";
import {
  matchonScrollablePillItemClass,
  matchonScrollablePillsClass,
} from "@/lib/ui/admin-ui";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "대시보드" },
  { href: "/admin/events", label: "대회" },
  { href: "/admin/organizers", label: "주최자" },
  { href: "/admin/credits", label: "크레딧" },
  { href: "/admin/gyms", label: "체육관" },
  { href: "/admin/fighters", label: "선수" },
  { href: "/admin/applications", label: "신청" },
  { href: "/admin/application-form-templates", label: "신청서 템플릿" },
  { href: "/admin/results", label: "결과" },
  { href: "/admin/audit-logs", label: "감사 로그" },
] as const;

export function AdminNavStrip() {
  return (
    <nav
      className="border-b bg-muted/30 px-4 py-2 md:px-6"
      aria-label="관리자 하위 메뉴"
    >
      <div className={cn("mx-auto max-w-7xl", matchonScrollablePillsClass)}>
        {LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              matchonScrollablePillItemClass,
              "min-h-10 shrink-0 text-xs md:text-sm",
            )}
          >
            {item.label}
          </Link>
        ))}
        <Link
          href="/notifications"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            matchonScrollablePillItemClass,
            "ml-auto min-h-10 shrink-0 text-xs md:text-sm",
          )}
        >
          알림
        </Link>
      </div>
    </nav>
  );
}
