import Link from "next/link";
import { BrandLogo } from "@/components/common/BrandLogo";
import { PUBLIC_CONTENT_CONTAINER_CLASS } from "@/components/domain/events/public/public-event-layout";
import type { DashboardRole } from "@/components/layout/DashboardShell";
import { cn } from "@/lib/utils";
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
      <header className="border-b bg-background py-3">
        <div
          className={cn(
            PUBLIC_CONTENT_CONTAINER_CLASS,
            "flex items-center justify-between gap-4",
          )}
        >
          <BrandLogo href="/" size="md" showText />
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
        <div className="flex min-w-0 items-center gap-3">
          <BrandLogo
            href={
              props.role === "organizer"
                ? "/organizer"
                : props.role === "gym"
                  ? "/gym"
                  : props.role === "fighter"
                    ? "/fighter"
                    : "/admin"
            }
            size="sm"
            showText
            className="shrink-0"
          />
          <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm font-medium text-muted-foreground">
            {titles[props.role]} 대시보드
          </span>
          <span className="text-muted-foreground truncate text-xs">
            {props.actorEmail}
          </span>
          </div>
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
