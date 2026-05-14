import Link from "next/link";
import type { DashboardRole } from "@/components/layout/DashboardShell";
import { LogoutButton } from "@/components/domain/auth/LogoutButton";
import { NotificationBell } from "@/components/domain/notifications/NotificationBell";

type HeaderProps =
  | { variant: "public" }
  | {
      variant: "dashboard";
      role: DashboardRole;
      actorUserId: string;
      actorEmail: string;
    };

export function Header(props: HeaderProps) {
  if (props.variant === "public") {
    return (
      <header className="border-b bg-background px-4 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link href="/" className="font-semibold tracking-tight">
            대회 플랫폼
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link href="/events" className="text-muted-foreground hover:text-foreground">
              대회 목록
            </Link>
            <Link href="/login" className="text-muted-foreground hover:text-foreground">
              로그인
            </Link>
          </nav>
        </div>
      </header>
    );
  }

  const titles: Record<DashboardRole, string> = {
    organizer: "주최자",
    gym: "체육관",
    fighter: "선수",
    admin: "관리자",
  };

  return (
    <header className="border-b bg-background px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm font-medium text-muted-foreground">
            {titles[props.role]} 대시보드
          </span>
          <span className="text-muted-foreground truncate text-xs">
            {props.actorEmail}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <NotificationBell userId={props.actorUserId} />
          <Link href="/" className="text-xs text-muted-foreground hover:text-foreground">
            공개 홈
          </Link>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
