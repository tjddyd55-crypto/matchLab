import Link from "next/link";
import { MatchonLogo } from "@/components/common/MatchonLogo";
import { PUBLIC_CONTENT_CONTAINER_CLASS } from "@/components/domain/events/public/public-event-layout";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PublicNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-matchon-border bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90">
      <div
        className={cn(
          PUBLIC_CONTENT_CONTAINER_CLASS,
          "flex h-[60px] items-center justify-between gap-4 py-0",
        )}
      >
        <MatchonLogo href="/" variant="light" size="md" />

        <nav className="hidden items-center md:flex">
          <Link
            href="/events"
            className="rounded-lg px-3.5 py-1.5 text-sm font-medium text-matchon-text-secondary transition-colors hover:text-matchon-text-primary"
          >
            대회 공고
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/judge/login"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "hidden border-matchon-border bg-matchon-sidebar text-xs text-white/85 hover:bg-matchon-sidebar hover:text-white sm:inline-flex",
            )}
          >
            심판 입장
          </Link>
          <Link
            href="/login"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "border-matchon-primary text-xs font-bold text-matchon-primary",
            )}
          >
            로그인
          </Link>
        </div>
      </div>
    </header>
  );
}
