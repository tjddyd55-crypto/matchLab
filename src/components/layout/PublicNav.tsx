import Link from "next/link";
import { MatchonLogo } from "@/components/common/MatchonLogo";
import { PUBLIC_CONTENT_CONTAINER_CLASS } from "@/components/domain/events/public/public-event-layout";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * 공개 헤더 SSOT — 서비스 소개 앵커 + 로그인/시작.
 * 운영용 judge 경로는 public 헤더에 노출하지 않는다.
 */
export function PublicNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-matchon-border bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90">
      <div
        className={cn(
          PUBLIC_CONTENT_CONTAINER_CLASS,
          "flex h-16 items-center justify-between gap-4 py-0 md:h-[68px]",
        )}
      >
        <MatchonLogo href="/" variant="light" size="md" />

        <nav
          className="hidden items-center gap-1 md:flex"
          aria-label="주요 메뉴"
        >
          <Link
            href="/#features"
            className="rounded-lg px-3.5 py-1.5 text-sm font-medium text-matchon-text-secondary transition-colors hover:text-matchon-text-primary"
          >
            기능 소개
          </Link>
          <Link
            href="/#gym"
            className="rounded-lg px-3.5 py-1.5 text-sm font-medium text-matchon-text-secondary transition-colors hover:text-matchon-text-primary"
          >
            체육관 관리
          </Link>
          <Link
            href="/#manager"
            className="rounded-lg px-3.5 py-1.5 text-sm font-medium text-matchon-text-secondary transition-colors hover:text-matchon-text-primary"
          >
            MATCHON Manager
          </Link>
          <Link
            href="/events"
            className="rounded-lg px-3.5 py-1.5 text-sm font-medium text-matchon-text-secondary transition-colors hover:text-matchon-text-primary"
          >
            대회 공고
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "border-matchon-border text-xs font-bold text-matchon-text-primary",
            )}
          >
            로그인
          </Link>
          <Link
            href="/login"
            className={cn(
              buttonVariants({ variant: "default", size: "sm" }),
              "text-xs font-bold",
            )}
          >
            시작하기
          </Link>
        </div>
      </div>
    </header>
  );
}
