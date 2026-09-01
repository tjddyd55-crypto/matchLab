import Link from "next/link";
import type { ReactNode } from "react";
import { MatchonLogo } from "@/components/common/MatchonLogo";
import { isMatchonDesktopRequest } from "@/lib/desktop/request";
import { desktopStaticPageFillClass } from "@/lib/ui/desktop-app-layout";
import { cn } from "@/lib/utils";

type OnboardingShellProps = {
  children: ReactNode;
  /** 헤더 우측 링크. 기본 `/login` */
  headerActionHref?: string;
  headerActionLabel?: string;
};

/**
 * 가입·신청·온보딩 전용 shell — marketing PublicNav 없음, scrollable main.
 */
export async function OnboardingShell({
  children,
  headerActionHref = "/login",
  headerActionLabel = "로그인",
}: OnboardingShellProps) {
  const isDesktop = await isMatchonDesktopRequest();

  return (
    <div
      className={cn(
        "flex flex-col bg-matchon-surface text-matchon-text-primary",
        isDesktop
          ? cn(
              desktopStaticPageFillClass,
              "h-full min-h-0 flex-1",
            )
          : "min-h-dvh",
      )}
    >
      <header className="shrink-0 border-b border-matchon-border/60 bg-white">
        <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between px-4 sm:px-6">
          <MatchonLogo href="/" size="sm" variant="light" />
          {headerActionHref ? (
            <Link
              href={headerActionHref}
              className="text-sm font-medium text-matchon-text-secondary hover:text-matchon-primary"
            >
              {headerActionLabel}
            </Link>
          ) : null}
        </div>
      </header>
      <main
        className={cn(
          "flex-1",
          isDesktop
            ? "min-h-0 overflow-x-hidden overflow-y-auto overscroll-contain"
            : "overflow-x-hidden",
        )}
      >
        <div className="mx-auto w-full max-w-2xl px-4 py-6 pb-16 sm:px-6 sm:py-8 sm:pb-20">
          {children}
        </div>
      </main>
    </div>
  );
}
